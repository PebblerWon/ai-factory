import axios from 'axios';
import WebSocket from 'ws';

interface NodeConfig {
  nodeId: string;
  nodeName: string;
  capabilities: ('llm' | 'image_gen')[];
  modelVersions: string[];
  availableHours: { start: number; end: number };
  loadThreshold: number;
}

interface Task {
  id: string;
  type: 'text_summary' | 'translation' | 'image_generation' | 'data_conversion';
  input: any;
  requirements: any;
  pointsCost: number;
}

type TaskHandler = (task: Task) => Promise<any>;

export class NodeAgent {
  private ws: WebSocket | null = null;
  private config: NodeConfig;
  private token: string;
  private taskHandler: TaskHandler;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private serverUrl: string;

  constructor(config: {
    nodeId: string;
    nodeName: string;
    capabilities: ('llm' | 'image_gen')[];
    modelVersions: string[];
    availableHours?: { start: number; end: number };
    loadThreshold?: number;
    token: string;
    taskHandler: TaskHandler;
    serverUrl?: string;
  }) {
    this.config = {
      nodeId: config.nodeId,
      nodeName: config.nodeName,
      capabilities: config.capabilities,
      modelVersions: config.modelVersions,
      availableHours: config.availableHours || { start: 0, end: 24 },
      loadThreshold: config.loadThreshold || 80,
    };
    this.token = config.token;
    this.taskHandler = config.taskHandler;
    this.serverUrl = config.serverUrl || 'ws://localhost:3001/ws';
  }

  connect(): void {
    this.ws = new WebSocket(this.serverUrl);

    this.ws.on('open', () => {
      console.log('[NodeAgent] Connected to server');
      this.register();
      this.startHeartbeat();
    });

    this.ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        await this.handleMessage(message);
      } catch (error) {
        console.error('[NodeAgent] Failed to parse message:', error);
      }
    });

    this.ws.on('close', () => {
      console.log('[NodeAgent] Disconnected from server');
      this.stopHeartbeat();
      this.scheduleReconnect();
    });

    this.ws.on('error', (error) => {
      console.error('[NodeAgent] WebSocket error:', error);
    });
  }

  private register(): void {
    this.send({
      type: 'register',
      nodeId: this.config.nodeId,
    });
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.send({ type: 'heartbeat' });
    }, 5000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private scheduleReconnect(): void {
    this.reconnectInterval = setTimeout(() => {
      console.log('[NodeAgent] Attempting to reconnect...');
      this.connect();
    }, 5000);
  }

  private async handleMessage(message: any): Promise<void> {
    switch (message.type) {
      case 'registered':
        console.log('[NodeAgent] Registered successfully');
        break;

      case 'heartbeat_ack':
        break;

      case 'new_task':
        console.log(`[NodeAgent] Received task: ${message.task.id}`);
        await this.processTask(message.task);
        break;

      case 'task_completed':
        console.log(`[NodeAgent] Task completed: ${message.taskId}`);
        break;

      case 'task_rejected':
        console.log(`[NodeAgent] Task rejected: ${message.taskId}, reason: ${message.reason}`);
        break;

      case 'error':
        console.error('[NodeAgent] Server error:', message.error);
        break;

      default:
        console.warn('[NodeAgent] Unknown message type:', message.type);
    }
  }

  private async processTask(task: Task): Promise<void> {
    try {
      console.log(`[NodeAgent] Processing task ${task.id} of type ${task.type}`);

      const result = await this.taskHandler(task);

      this.send({
        type: 'task_result',
        taskId: task.id,
        result,
      });

      console.log(`[NodeAgent] Task ${task.id} result submitted`);
    } catch (error) {
      console.error(`[NodeAgent] Task ${task.id} failed:`, error);

      this.send({
        type: 'task_result',
        taskId: task.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  disconnect(): void {
    this.stopHeartbeat();
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
      this.reconnectInterval = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export default NodeAgent;
