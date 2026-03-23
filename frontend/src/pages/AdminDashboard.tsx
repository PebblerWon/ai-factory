import { useEffect, useState } from 'react';
import { adminService } from '../services/api';
import { Bot, ListTodo, Coins, Wifi, Shield, Ban, XCircle } from 'lucide-react';

interface Statistics {
  nodes: { total: number; online: number };
  tasks: { total: number; completed: number; pending: number };
  points: { totalIncome: number; totalExpense: number };
}

interface Node {
  id: string;
  nodeName: string;
  capabilities: string[];
  status: string;
  lastHeartbeat: string;
}

interface Task {
  id: string;
  type: string;
  status: string;
  creatorId: string;
  pointsCost: number;
  createdAt: string;
}

export default function AdminDashboard() {
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'nodes' | 'tasks'>('overview');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, nodesRes, tasksRes] = await Promise.all([
        adminService.getStatistics(),
        adminService.getAllNodes(),
        adminService.getAllTasks(),
      ]);
      setStatistics(statsRes.data);
      setNodes(nodesRes.data);
      setTasks(tasksRes.data);
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBanNode = async (nodeId: string) => {
    try {
      await adminService.banNode(nodeId);
      loadData();
    } catch (error) {
      console.error('Failed to ban node:', error);
    }
  };

  const handleCancelTask = async (taskId: string) => {
    try {
      await adminService.cancelTask(taskId);
      loadData();
    } catch (error) {
      console.error('Failed to cancel task:', error);
    }
  };

  const taskTypeLabels: Record<string, string> = {
    text_summary: '文本总结',
    translation: '翻译',
    image_generation: '图片生成',
    data_conversion: '数据转换',
  };

  const statusConfig: Record<string, { label: string; color: string }> = {
    pending: { label: '等待中', color: 'text-yellow-600 bg-yellow-100' },
    assigned: { label: '已派单', color: 'text-blue-600 bg-blue-100' },
    processing: { label: '处理中', color: 'text-blue-600 bg-blue-100' },
    completed: { label: '已完成', color: 'text-green-600 bg-green-100' },
    rejected: { label: '已驳回', color: 'text-red-600 bg-red-100' },
    cancelled: { label: '已取消', color: 'text-gray-600 bg-gray-100' },
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
      <div className="flex items-center">
        <Shield className="w-8 h-8 text-primary-600 mr-3" />
        <h1 className="text-2xl font-bold text-gray-900">后台管理</h1>
      </div>

      <div className="flex space-x-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'overview'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          数据概览
        </button>
        <button
          onClick={() => setActiveTab('nodes')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'nodes'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          节点管理
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'tasks'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          任务管理
        </button>
      </div>

      {activeTab === 'overview' && statistics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Bot className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">节点统计</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-gray-900">{statistics.nodes.total}</p>
                <p className="text-sm text-gray-500">总节点数</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-3xl font-bold text-green-600">{statistics.nodes.online}</p>
                <p className="text-sm text-gray-500">在线节点</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <ListTodo className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">任务统计</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{statistics.tasks.total}</p>
                <p className="text-xs text-gray-500">总计</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">{statistics.tasks.pending}</p>
                <p className="text-xs text-gray-500">进行中</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{statistics.tasks.completed}</p>
                <p className="text-xs text-gray-500">已完成</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-primary-100 rounded-lg">
                <Coins className="w-6 h-6 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">积分流通</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">+{statistics.points.totalIncome}</p>
                <p className="text-xs text-gray-500">总收入</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">-{statistics.points.totalExpense}</p>
                <p className="text-xs text-gray-500">总支出</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'nodes' && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">节点列表</h2>
          {nodes.length === 0 ? (
            <p className="text-center text-gray-500 py-8">暂无节点</p>
          ) : (
            <div className="space-y-3">
              {nodes.map((node) => (
                <div
                  key={node.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center">
                    <div className={`p-2 rounded-full ${
                      node.status === 'online' ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <Wifi className={`w-5 h-5 ${
                        node.status === 'online' ? 'text-green-600' : 'text-gray-400'
                      }`} />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900">{node.nodeName}</p>
                      <p className="text-xs text-gray-500">
                        ID: {node.id.slice(0, 8)}... | 能力: {node.capabilities.join(', ')}
                      </p>
                      <p className="text-xs text-gray-400">
                        最后心跳: {node.lastHeartbeat || '无'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className={`px-2 py-1 text-xs font-medium rounded mr-3 ${
                      node.status === 'online' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {node.status === 'online' ? '在线' : '离线'}
                    </span>
                    {node.status === 'online' && (
                      <button
                        onClick={() => handleBanNode(node.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="封禁节点"
                      >
                        <Ban className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">任务列表</h2>
          {tasks.length === 0 ? (
            <p className="text-center text-gray-500 py-8">暂无任务</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">任务ID</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">类型</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">状态</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">费用</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">创建时间</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr key={task.id} className="border-b border-gray-100">
                      <td className="py-3 px-4 text-sm text-gray-900">{task.id.slice(0, 8)}...</td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {taskTypeLabels[task.type] || task.type}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          statusConfig[task.status]?.color || 'bg-gray-100 text-gray-700'
                        }`}>
                          {statusConfig[task.status]?.label || task.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">{task.pointsCost}</td>
                      <td className="py-3 px-4 text-sm text-gray-500">{task.createdAt}</td>
                      <td className="py-3 px-4 text-right">
                        {task.status === 'pending' && (
                          <button
                            onClick={() => handleCancelTask(task.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                            title="取消任务"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
