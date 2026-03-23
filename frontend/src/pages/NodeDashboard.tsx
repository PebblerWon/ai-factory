import { useEffect, useState, useRef } from 'react';
import { nodeService, taskService } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { Bot, Plus, Wifi, WifiOff, Clock, CheckCircle, Loader } from 'lucide-react';

interface Task {
  id: string;
  type: string;
  input: any;
  requirements: any;
  pointsCost: number;
  createdAt: string;
}

export default function NodeDashboard() {
  const { user } = useAuthStore();
  const [nodeId, setNodeId] = useState<string | null>(null);
  const [status, setStatus] = useState<'online' | 'offline' | 'busy'>('offline');
  const [nodes, setNodes] = useState<any[]>([]);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const [newNode, setNewNode] = useState({
    nodeName: '',
    capabilities: ['llm'] as ('llm' | 'image_gen')[],
    modelVersions: ['gpt-4'],
    availableHours: { start: 0, end: 24 },
    loadThreshold: 80,
  });

  useEffect(() => {
    loadNodes();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (nodeId) {
      connectWebSocket(nodeId);
      loadPendingTasks();
    }
  }, [nodeId]);

  const loadNodes = async () => {
    try {
      const response = await nodeService.list();
      setNodes(response.data);
      if (response.data.length > 0) {
        setNodeId(response.data[0].id);
        setStatus(response.data[0].status);
      }
    } catch (error) {
      console.error('Failed to load nodes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPendingTasks = async () => {
    try {
      const response = await taskService.getPending();
      setPendingTasks(response.data);
    } catch (error) {
      console.error('Failed to load pending tasks:', error);
    }
  };

  const connectWebSocket = (nid: string) => {
    const ws = new WebSocket(`ws://${window.location.hostname}:3001/ws`);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'register', nodeId: nid }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'registered':
          setStatus('online');
          startHeartbeat(ws);
          break;
        case 'heartbeat_ack':
          break;
        case 'new_task':
          setCurrentTask(message.task);
          setStatus('busy');
          break;
        case 'task_completed':
          setCurrentTask(null);
          setStatus('online');
          loadPendingTasks();
          break;
        case 'task_rejected':
          setCurrentTask(null);
          setStatus('online');
          loadPendingTasks();
          break;
      }
    };

    ws.onclose = () => {
      setStatus('offline');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    wsRef.current = ws;
  };

  const startHeartbeat = (ws: WebSocket) => {
    setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'heartbeat' }));
      }
    }, 5000);
  };

  const handleCreateNode = async () => {
    try {
      const response = await nodeService.create(newNode);
      setNodes([...nodes, response.data]);
      setNodeId(response.data.id);
      setShowCreateModal(false);
      connectWebSocket(response.data.id);
    } catch (error) {
      console.error('Failed to create node:', error);
    }
  };

  const handleSubmitTask = async () => {
    if (!currentTask || !wsRef.current) return;

    let result: any = {};

    switch (currentTask.type) {
      case 'text_summary':
        result = {
          summary: `这是对输入内容的总结。原始内容: ${currentTask.input.content?.substring(0, 50)}...`,
        };
        break;
      case 'translation':
        result = {
          translatedText: `[翻译结果] ${currentTask.input.text}`,
        };
        break;
      case 'image_generation':
        result = {
          images: [
            `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='512' height='512'%3E%3Crect fill='%23${Math.floor(Math.random()*16777215).toString(16)}' width='512' height='512'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='24'%3EGenerated Image%3C/text%3E%3C/svg%3E`,
          ],
        };
        break;
      case 'data_conversion':
        result = {
          convertedData: '[转换后的数据]',
        };
        break;
    }

    wsRef.current.send(JSON.stringify({
      type: 'task_result',
      taskId: currentTask.id,
      result,
    }));
  };

  const taskTypeLabels: Record<string, string> = {
    text_summary: '文本总结',
    translation: '翻译',
    image_generation: '图片生成',
    data_conversion: '数据转换',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">节点管理</h1>
        {nodes.length === 0 && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            创建节点
          </button>
        )}
      </div>

      {nodes.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Bot className="w-8 h-8 text-primary-600 mr-3" />
              <div>
                <h2 className="text-lg font-medium text-gray-900">
                  {nodes.find(n => n.id === nodeId)?.nodeName || '未命名节点'}
                </h2>
                <p className="text-sm text-gray-500">
                  ID: {nodeId?.slice(0, 8)}...
                </p>
              </div>
            </div>
            <div className={`flex items-center px-3 py-1 rounded-full ${
              status === 'online' ? 'bg-green-100 text-green-700' :
              status === 'busy' ? 'bg-yellow-100 text-yellow-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {status === 'online' ? (
                <Wifi className="w-4 h-4 mr-1" />
              ) : (
                <WifiOff className="w-4 h-4 mr-1" />
              )}
              <span className="text-sm font-medium">
                {status === 'online' ? '在线' : status === 'busy' ? '忙碌中' : '离线'}
              </span>
            </div>
          </div>
        </div>
      )}

      {currentTask ? (
        <div className="card border-primary-200 bg-primary-50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">当前任务</h2>
            <span className="px-2 py-1 text-xs font-medium rounded bg-primary-200 text-primary-800">
              +{currentTask.pointsCost} 积分
            </span>
          </div>
          <div className="bg-white rounded-lg p-4 mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">
              {taskTypeLabels[currentTask.type]}
            </p>
            <pre className="text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-x-auto">
              {JSON.stringify(currentTask.input, null, 2)}
            </pre>
          </div>
          <button
            onClick={handleSubmitTask}
            className="btn-primary w-full flex items-center justify-center"
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            提交结果
          </button>
        </div>
      ) : (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">待接任务</h2>
          {pendingTasks.length === 0 ? (
            <div className="text-center py-8">
              <Loader className="w-12 h-12 text-gray-300 mx-auto mb-4 animate-spin" />
              <p className="text-gray-500">暂无待接任务，等待派单中...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingTasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {taskTypeLabels[task.type]}
                    </p>
                    <p className="text-xs text-gray-500">
                      {task.createdAt}
                    </p>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium rounded bg-primary-100 text-primary-700">
                    {task.pointsCost} 积分
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">创建新节点</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  节点名称
                </label>
                <input
                  type="text"
                  value={newNode.nodeName}
                  onChange={(e) => setNewNode({ ...newNode, nodeName: e.target.value })}
                  className="input-field"
                  placeholder="例如: 我的 GPT-4 节点"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  能力
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newNode.capabilities.includes('llm')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewNode({
                            ...newNode,
                            capabilities: [...newNode.capabilities, 'llm'],
                          });
                        } else {
                          setNewNode({
                            ...newNode,
                            capabilities: newNode.capabilities.filter(c => c !== 'llm'),
                          });
                        }
                      }}
                      className="mr-2"
                    />
                    LLM (文本处理)
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newNode.capabilities.includes('image_gen')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewNode({
                            ...newNode,
                            capabilities: [...newNode.capabilities, 'image_gen'],
                          });
                        } else {
                          setNewNode({
                            ...newNode,
                            capabilities: newNode.capabilities.filter(c => c !== 'image_gen'),
                          });
                        }
                      }}
                      className="mr-2"
                    />
                    图片生成
                  </label>
                </div>
              </div>
              <div className="flex justify-end space-x-4 pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                >
                  取消
                </button>
                <button
                  onClick={handleCreateNode}
                  className="btn-primary"
                >
                  创建
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
