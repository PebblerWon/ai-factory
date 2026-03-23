import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { taskService, walletService } from '../services/api';
import { ArrowLeft, Send, FileText, Languages, Image, RefreshCw, Coins } from 'lucide-react';
import type { TaskType } from '@ai-factory/shared';

const TASK_POINTS: Record<TaskType, number> = {
  text_summary: 10,
  translation: 15,
  image_generation: 25,
  data_conversion: 12,
};

const TASK_LABELS: Record<TaskType, string> = {
  text_summary: '文本总结',
  translation: '翻译',
  image_generation: '图片生成',
  data_conversion: '数据转换',
};

const taskTypes: { type: TaskType; icon: any; description: string }[] = [
  {
    type: 'text_summary',
    icon: FileText,
    description: '对文本进行总结和提炼',
  },
  {
    type: 'translation',
    icon: Languages,
    description: '文本翻译（支持多语言）',
  },
  {
    type: 'image_generation',
    icon: Image,
    description: '根据描述生成图片',
  },
  {
    type: 'data_conversion',
    icon: RefreshCw,
    description: '数据格式转换（Excel/CSV/JSON）',
  },
];

export default function TaskCreate() {
  const navigate = useNavigate();
  const [taskType, setTaskType] = useState<TaskType>('text_summary');
  const [content, setContent] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('中文');
  const [targetLanguage, setTargetLanguage] = useState('英文');
  const [imageStyles, setImageStyles] = useState<string[]>([]);
  const [imageCount, setImageCount] = useState(1);
  const [imageSize, setImageSize] = useState('1024x1024');
  const [inputFormat, setInputFormat] = useState<'excel' | 'csv' | 'json'>('excel');
  const [outputFormat, setOutputFormat] = useState<'csv' | 'json'>('csv');
  const [deadline, setDeadline] = useState(60);
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let input: any = {};
      switch (taskType) {
        case 'text_summary':
          input = { content };
          break;
        case 'translation':
          input = { text: content, sourceLanguage, targetLanguage };
          break;
        case 'image_generation':
          input = { content, imageStyles, imageCount, imageSize };
          break;
        case 'data_conversion':
          input = { content, inputFormat, outputFormat };
          break;
      }

      const response = await taskService.create({
        type: taskType,
        input,
        requirements: {
          deadline,
        },
      });

      navigate('/tasks');
    } catch (err: any) {
      setError(err.error || '创建任务失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <button
          onClick={() => navigate('/tasks')}
          className="mr-4 p-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">发布新任务</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">选择任务类型</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {taskTypes.map(({ type, icon: Icon, description }) => (
              <button
                key={type}
                type="button"
                onClick={() => setTaskType(type)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  taskType === type
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center mb-2">
                  <Icon className={`w-6 h-6 mr-3 ${
                    taskType === type ? 'text-primary-600' : 'text-gray-400'
                  }`} />
                  <span className="text-lg font-medium text-gray-900">
                    {TASK_LABELS[type]}
                  </span>
                  <span className="ml-auto px-2 py-0.5 text-xs font-medium rounded bg-primary-100 text-primary-700">
                    {TASK_POINTS[type]} 积分
                  </span>
                </div>
                <p className="text-sm text-gray-500">{description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">任务输入</h2>

          {taskType === 'text_summary' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                文本内容
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="input-field h-40"
                placeholder="请输入需要总结的文本内容..."
                required
              />
            </div>
          )}

          {taskType === 'translation' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  源语言
                </label>
                <select
                  value={sourceLanguage}
                  onChange={(e) => setSourceLanguage(e.target.value)}
                  className="input-field"
                >
                  <option value="中文">中文</option>
                  <option value="英文">英文</option>
                  <option value="日文">日文</option>
                  <option value="韩文">韩文</option>
                  <option value="法文">法文</option>
                  <option value="德文">德文</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  目标语言
                </label>
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="input-field"
                >
                  <option value="中文">中文</option>
                  <option value="英文">英文</option>
                  <option value="日文">日文</option>
                  <option value="韩文">韩文</option>
                  <option value="法文">法文</option>
                  <option value="德文">德文</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  文本内容
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="input-field h-40"
                  placeholder="请输入需要翻译的文本..."
                  required
                />
              </div>
            </div>
          )}

          {taskType === 'image_generation' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  图片描述
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="input-field h-32"
                  placeholder="请描述您想要生成的图片..."
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    图片数量
                  </label>
                  <select
                    value={imageCount}
                    onChange={(e) => setImageCount(Number(e.target.value))}
                    className="input-field"
                  >
                    <option value={1}>1 张</option>
                    <option value={2}>2 张</option>
                    <option value={4}>4 张</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    图片尺寸
                  </label>
                  <select
                    value={imageSize}
                    onChange={(e) => setImageSize(e.target.value)}
                    className="input-field"
                  >
                    <option value="512x512">512x512</option>
                    <option value="1024x1024">1024x1024</option>
                    <option value="1792x1024">1792x1024</option>
                    <option value="1024x1792">1024x1792</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {taskType === 'data_conversion' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    输入格式
                  </label>
                  <select
                    value={inputFormat}
                    onChange={(e) => setInputFormat(e.target.value as any)}
                    className="input-field"
                  >
                    <option value="excel">Excel</option>
                    <option value="csv">CSV</option>
                    <option value="json">JSON</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    输出格式
                  </label>
                  <select
                    value={outputFormat}
                    onChange={(e) => setOutputFormat(e.target.value as any)}
                    className="input-field"
                  >
                    <option value="csv">CSV</option>
                    <option value="json">JSON</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  数据内容（粘贴数据或上传文件）
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="input-field h-40"
                  placeholder="请粘贴需要转换的数据内容..."
                  required
                />
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">任务设置</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                完成时限（分钟）
              </label>
              <select
                value={deadline}
                onChange={(e) => setDeadline(Number(e.target.value))}
                className="input-field"
              >
                <option value={30}>30 分钟</option>
                <option value={60}>1 小时</option>
                <option value={120}>2 小时</option>
                <option value={360}>6 小时</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card bg-primary-50 border-primary-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-medium text-gray-900">任务费用</p>
              <p className="text-sm text-gray-500">从您的积分余额中扣除</p>
            </div>
            <div className="flex items-center">
              <Coins className="w-6 h-6 text-primary-600 mr-2" />
              <span className="text-2xl font-bold text-primary-700">
                {TASK_POINTS[taskType]} 积分
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/tasks')}
            className="btn-secondary"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex items-center"
          >
            {loading ? (
              <span className="animate-spin mr-2">⏳</span>
            ) : (
              <Send className="w-5 h-5 mr-2" />
            )}
            发布任务
          </button>
        </div>
      </form>
    </div>
  );
}
