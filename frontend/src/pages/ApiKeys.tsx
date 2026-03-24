import { useEffect, useState } from 'react';
import { apiKeyService, ApiKey } from '../services/api';
import { Key, Plus, Trash2, Copy, Check, AlertTriangle, Clock } from 'lucide-react';

export default function ApiKeys() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      const response = await apiKeyService.list();
      setApiKeys(response.data);
    } catch (error) {
      console.error('Failed to load API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    setCreating(true);
    try {
      const response = await apiKeyService.create(newKeyName.trim());
      setNewlyCreatedKey(response.data.key);
      setNewKeyName('');
      await loadApiKeys();
    } catch (error) {
      console.error('Failed to create API key:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此API密钥吗？此操作不可撤销。')) return;

    setDeletingId(id);
    try {
      await apiKeyService.delete(id);
      await loadApiKeys();
    } catch (error) {
      console.error('Failed to delete API key:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
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
        <h1 className="text-2xl font-bold text-gray-900">API密钥管理</h1>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800">安全提示</h3>
            <p className="text-sm text-yellow-700 mt-1">
              API密钥仅在创建时显示一次。请立即复制并妥善保存，切勿泄露给他人。
            </p>
          </div>
        </div>
      </div>

      {newlyCreatedKey && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start flex-1">
              <Check className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-green-800">API密钥创建成功</h3>
                <p className="text-sm text-green-700 mt-1 mb-3">
                  请立即复制并保存您的API密钥。此密钥将不再显示。
                </p>
                <div className="bg-white border border-green-300 rounded p-3 font-mono text-sm break-all">
                  {newlyCreatedKey}
                </div>
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(newlyCreatedKey)}
              className="ml-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span className="ml-2">{copied ? '已复制' : '复制'}</span>
            </button>
          </div>
          <button
            onClick={() => setNewlyCreatedKey(null)}
            className="mt-3 text-sm text-green-700 hover:text-green-800 underline"
          >
            我已保存，不再显示
          </button>
        </div>
      )}

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">创建新密钥</h2>
        <form onSubmit={handleCreate} className="flex gap-3">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="例如：我的应用、测试环境"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            maxLength={100}
          />
          <button
            type="submit"
            disabled={creating || !newKeyName.trim()}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {creating ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                <span className="ml-2">创建</span>
              </>
            )}
          </button>
        </form>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">已有密钥</h2>

        {apiKeys.length === 0 ? (
          <div className="text-center py-12">
            <Key className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无API密钥</p>
          </div>
        ) : (
          <div className="space-y-3">
            {apiKeys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center flex-1">
                  <div className="p-2 bg-primary-100 rounded-lg">
                    <Key className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-gray-900">{key.name}</p>
                    <p className="text-sm text-gray-500 font-mono">{key.keyPrefix}</p>
                  </div>
                </div>
                <div className="flex items-center text-sm text-gray-500 mr-4">
                  {key.lastUsedAt ? (
                    <span className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      最后使用：{new Date(key.lastUsedAt).toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="text-gray-400">从未使用</span>
                  )}
                </div>
                <div className="text-xs text-gray-400 mr-4">
                  创建于 {new Date(key.createdAt).toLocaleDateString()}
                </div>
                <button
                  onClick={() => handleDelete(key.id)}
                  disabled={deletingId === key.id}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                  title="删除密钥"
                >
                  {deletingId === key.id ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                  ) : (
                    <Trash2 className="w-5 h-5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
