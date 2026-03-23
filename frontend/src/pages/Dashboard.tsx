import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { walletService, taskService } from '../services/api';
import { Coins, ListTodo, Clock, CheckCircle } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuthStore();
  const [points, setPoints] = useState(0);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [balanceRes, tasksRes] = await Promise.all([
        walletService.getBalance(),
        taskService.list(),
      ]);
      setPoints(balanceRes.data.points);
      setTasks(tasksRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending' || t.status === 'assigned').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    rejected: tasks.filter(t => t.status === 'rejected').length,
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
        <h1 className="text-2xl font-bold text-gray-900">欢迎回来，{user?.email}</h1>
        <div className="flex items-center bg-primary-50 px-4 py-2 rounded-lg">
          <Coins className="w-5 h-5 text-primary-600 mr-2" />
          <span className="text-lg font-semibold text-primary-700">{points} 积分</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <ListTodo className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">总任务数</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">进行中</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">已完成</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-lg">
              <ListTodo className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">已驳回</p>
              <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">快速开始</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="/tasks/create"
            className="p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all"
          >
            <h3 className="text-lg font-medium text-gray-900">发布新任务</h3>
            <p className="text-sm text-gray-500 mt-1">创建文本总结、翻译、图片生成或数据转换任务</p>
          </a>
          <a
            href="/tasks"
            className="p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all"
          >
            <h3 className="text-lg font-medium text-gray-900">查看任务列表</h3>
            <p className="text-sm text-gray-500 mt-1">管理您创建的所有任务，查看执行状态</p>
          </a>
        </div>
      </div>

      {tasks.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">最近任务</h2>
          <div className="space-y-3">
            {tasks.slice(0, 5).map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full ${
                    task.status === 'completed' ? 'bg-green-500' :
                    task.status === 'pending' ? 'bg-yellow-500' :
                    task.status === 'assigned' ? 'bg-blue-500' :
                    task.status === 'rejected' ? 'bg-red-500' : 'bg-gray-400'
                  }`} />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">
                      {task.type === 'text_summary' ? '文本总结' :
                       task.type === 'translation' ? '翻译' :
                       task.type === 'image_generation' ? '图片生成' : '数据转换'}
                    </p>
                    <p className="text-xs text-gray-500">{task.createdAt}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded ${
                  task.status === 'completed' ? 'bg-green-100 text-green-700' :
                  task.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  task.status === 'assigned' ? 'bg-blue-100 text-blue-700' :
                  task.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {task.status === 'completed' ? '已完成' :
                   task.status === 'pending' ? '等待中' :
                   task.status === 'assigned' ? '已派单' :
                   task.status === 'rejected' ? '已驳回' : task.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
