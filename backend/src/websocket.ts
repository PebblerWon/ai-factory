import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import {
  updateNodeStatus,
  getNodeById,
  getPendingTasks,
  updateTaskAssignment,
  getTaskById,
  updateUserPoints,
  createTransaction,
} from './sqlite';
import { TASK_POINTS, NodeCapability, TaskType } from '@ai-factory/shared';

interface NodeConnection {
  ws: WebSocket;
  nodeId: string;
  userId: string;
}

const nodeConnections = new Map<string, NodeConnection>();

const taskTypeToCapability: Record<TaskType, NodeCapability[]> = {
  text_summary: ['llm'],
  translation: ['llm'],
  image_generation: ['image_gen'],
  data_conversion: ['llm'],
};

export function handleNodeWebSocket(ws: WebSocket) {
  let nodeId: string | null = null;

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'register':
          nodeId = message.nodeId;
          const node = getNodeById(nodeId!) as any;

          if (!node) {
            ws.send(JSON.stringify({ type: 'error', error: 'Node not found' }));
            return;
          }

          nodeConnections.set(nodeId!, {
            ws,
            nodeId: nodeId!,
            userId: node.user_id,
          });

          updateNodeStatus(nodeId!, 'online', new Date().toISOString());

          ws.send(JSON.stringify({
            type: 'registered',
            nodeId: nodeId!,
            status: 'online'
          }));

          console.log(`Node ${nodeId} connected`);
          break;

        case 'heartbeat':
          if (!nodeId) {
            ws.send(JSON.stringify({ type: 'error', error: 'Not registered' }));
            return;
          }

          updateNodeStatus(nodeId, 'online', new Date().toISOString());

          ws.send(JSON.stringify({
            type: 'heartbeat_ack',
            timestamp: new Date().toISOString()
          }));
          break;

        case 'task_result':
          if (!nodeId) {
            ws.send(JSON.stringify({ type: 'error', error: 'Not registered' }));
            return;
          }

          await handleTaskResult(nodeId, message);
          break;

        case 'status_change':
          if (!nodeId) {
            ws.send(JSON.stringify({ type: 'error', error: 'Not registered' }));
            return;
          }

          updateNodeStatus(nodeId, message.status, new Date().toISOString());
          break;

        default:
          ws.send(JSON.stringify({ type: 'error', error: 'Unknown message type' }));
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({ type: 'error', error: 'Invalid message format' }));
    }
  });

  ws.on('close', () => {
    if (nodeId) {
      updateNodeStatus(nodeId, 'offline', new Date().toISOString());
      nodeConnections.delete(nodeId);
      console.log(`Node ${nodeId} disconnected`);
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    if (nodeId) {
      updateNodeStatus(nodeId, 'offline', new Date().toISOString());
      nodeConnections.delete(nodeId);
    }
  });
}

async function handleTaskResult(nodeId: string, message: any) {
  const { taskId, result, error } = message;

  const task = getTaskById(taskId) as any;

  if (!task) {
    nodeConnections.get(nodeId)?.ws.send(JSON.stringify({
      type: 'error',
      error: 'Task not found'
    }));
    return;
  }

  if (task.assigned_node_id !== nodeId) {
    nodeConnections.get(nodeId)?.ws.send(JSON.stringify({
      type: 'error',
      error: 'Task not assigned to this node'
    }));
    return;
  }

  const isValid = validateResult(task.type, result, JSON.parse(task.requirements));

  if (isValid && !error) {
    updateTaskOutput(taskId, JSON.stringify(result), 'completed');

    updateUserPoints(task.creator_id, TASK_POINTS[task.type as TaskType]);

    createTransaction({
      id: uuidv4(),
      userId: task.creator_id,
      type: 'income',
      amount: TASK_POINTS[task.type as TaskType],
      taskId,
      description: `任务完成返还: ${task.type}`,
    });

    nodeConnections.get(nodeId)?.ws.send(JSON.stringify({
      type: 'task_completed',
      taskId,
      status: 'completed'
    }));

    console.log(`Task ${taskId} completed by node ${nodeId}`);
  } else {
    updateTaskOutput(taskId, JSON.stringify({ error: error || 'Invalid result' }), 'rejected');

    nodeConnections.get(nodeId)?.ws.send(JSON.stringify({
      type: 'task_rejected',
      taskId,
      reason: error || 'Result validation failed'
    }));

    console.log(`Task ${taskId} rejected by node ${nodeId}`);
  }

  updateNodeStatus(nodeId, 'online', new Date().toISOString());
}

function validateResult(taskType: string, result: any, requirements: any): boolean {
  if (!result) return false;

  switch (taskType) {
    case 'text_summary':
      return typeof result.summary === 'string' && result.summary.length > 0;

    case 'translation':
      return typeof result.translatedText === 'string' && result.translatedText.length > 0;

    case 'image_generation':
      if (!Array.isArray(result.images)) return false;
      if (requirements.imageCount && result.images.length < requirements.imageCount) return false;
      return result.images.every((img: string) => typeof img === 'string' && img.length > 0);

    case 'data_conversion':
      return typeof result.convertedData === 'string' && result.convertedData.length > 0;

    default:
      return false;
  }
}

export function assignTaskToNode(taskId: string): string | null {
  const task = getTaskById(taskId) as any;

  if (!task || task.status !== 'pending') {
    return null;
  }

  const requiredCapabilities = taskTypeToCapability[task.type as TaskType];

  for (const capability of requiredCapabilities) {
    const onlineNodes = getOnlineNodesByCapability(capability);

    if (onlineNodes.length > 0) {
      const node = (onlineNodes as any[])[0];

      updateTaskAssignment(taskId, node.id);

      const taskDetails = getTaskById(taskId) as any;

      nodeConnections.get(node.id)?.ws.send(JSON.stringify({
        type: 'new_task',
        task: {
          id: taskDetails.id,
          type: taskDetails.type,
          input: JSON.parse(taskDetails.input),
          requirements: JSON.parse(taskDetails.requirements),
          pointsCost: taskDetails.points_cost,
        }
      }));

      console.log(`Task ${taskId} assigned to node ${node.id}`);

      return node.id;
    }
  }

  return null;
}

function getOnlineNodesByCapability(capability: string) {
  const { getOnlineNodesByCapability: getNodes } = require('./sqlite');
  return getNodes(capability);
}

setInterval(() => {
  const pendingTasks = getPendingTasks() as any[];

  for (const task of pendingTasks) {
    assignTaskToNode(task.id);
  }
}, 5000);

setInterval(() => {
  const now = Date.now();
  const timeout = 30 * 1000;

  for (const [nodeId, connection] of nodeConnections.entries()) {
    const node = getNodeById(nodeId) as any;

    if (node) {
      const lastHeartbeat = new Date(node.last_heartbeat).getTime();

      if (now - lastHeartbeat > timeout) {
        updateNodeStatus(nodeId, 'offline', node.last_heartbeat);
        nodeConnections.delete(nodeId);
        console.log(`Node ${nodeId} timed out`);
      }
    }
  }
}, 10000);
