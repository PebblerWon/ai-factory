import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { taskService } from '../services/api';
import { Plus, Clock, CheckCircle, XCircle, Loader } from 'lucide-react';

export default function Tasks() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const response = await taskService.list();
      setTasks(response.data);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = filter === 'all'
    ? tasks
    : tasks.filter(t => t.status === filter);

  const statusConfig: Record<string, { icon: any; label: string; color: string }> = {
    pending: { icon: Clock, label: '等待中', color: 'text-yellow-600 bg-yellow-100' },
    assigned: { icon: Loader, label: '已派单', color: 'text-blue-600 bg-blue-100' },
    processing: { icon: Loader, label: '处理中', color: 'text-blue-600 bg-blue-100' },
    completed: { icon: CheckCircle, label: '已完成', color: 'text-green-600 bg-green-100' },
    rejected: { icon: XCircle, label: '已驳回', color: 'text-red-600 bg-red-100' },
    cancelled: { icon: XCircle, label: '已取消', color: 'text-gray-600 bg-gray-100' },
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
        <h1 className="text-2xl font-bold text-gray-900">任务管理</h1>
        <Link to="/tasks/create" className="btn-primary flex items-center">
          <Plus className="w-5 h-5 mr-2" />
          发布任务
        </Link>
      </div>

      <div className="flex space-x-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          全部 ({tasks.length})
        </button>
        {Object.entries(statusConfig).map(([status, config]) => {
          const count = tasks.filter(t => t.status === status).length;
          if (count === 0) return null;
          return (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {config.label} ({count})
            </button>
          );
        })}
      </div>

      {filteredTasks.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 mb-4">暂无任务</p>
          <Link to="/tasks/create" className="btn-primary inline-flex items-center">
            <Plus className="w-5 h-5 mr-2" />
            发布第一个任务
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task) => {
            const StatusIcon = statusConfig[task.status]?.icon || Clock;
            return (
              <div key={task.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <h3 className="text-lg font-medium text-gray-900">
                        {taskTypeLabels[task.type]}
                      </h3>
                      <span className={`ml-3 px-2 py-0.5 text-xs font-medium rounded ${statusConfig[task.status]?.color}`}>
                        <StatusIcon className="w-3 h-3 inline mr-1" />
                        {statusConfig[task.status]?.label}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 space-y-1">
                      <p>任务ID: {task.id.slice(0, 8)}...</p>
                      <p>消耗积分: {task.pointsCost}</p>
                      <p>创建时间: {task.createdAt}</p>
                      {task.assignedAt && <p>派单时间: {task.assignedAt}</p>}
                      {task.completedAt && <p>完成时间: {task.completedAt}</p>}
                    </div>
                    {task.output && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-700 mb-2">输出结果:</p>
                        <pre className="text-sm text-gray-600 whitespace-pre-wrap overflow-x-auto">
                          {JSON.stringify(task.output, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
