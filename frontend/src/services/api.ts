import axios from 'axios';
import type {
  TaskType,
  NodeCapability,
  TaskInput,
  TaskRequirements,
  TaskStatus,
  NodeStatus
} from '@ai-factory/shared';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  // 从 Zustand persist 存储中获取 token
  const authStorage = localStorage.getItem('auth-storage');
  if (authStorage) {
    try {
      const { state } = JSON.parse(authStorage);
      if (state?.token) {
        config.headers.Authorization = `Bearer ${state.token}`;
      }
    } catch (e) {
      console.error('Failed to parse auth storage:', e);
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      const isAuthEndpoint = error.config?.url?.includes('/auth/');
      if (!isAuthEndpoint) {
        // 从 Zustand persist 存储中删除 token
        const authStorage = localStorage.getItem('auth-storage');
        if (authStorage) {
          try {
            const { state } = JSON.parse(authStorage);
            if (state?.token) {
              localStorage.setItem('auth-storage', JSON.stringify({
                ...JSON.parse(authStorage),
                state: { ...state, token: null }
              }));
            }
          } catch (e) {
            console.error('Failed to update auth storage:', e);
          }
        }
        window.location.href = '/login';
      }
    }
    return Promise.reject(error.response?.data || error);
  }
);

export interface User {
  id: string;
  email: string;
  role: 'user' | 'node' | 'admin';
  points?: number;
}

export interface Node {
  id: string;
  nodeName: string;
  capabilities: NodeCapability[];
  modelVersions: string[];
  availableHours: { start: number; end: number };
  loadThreshold: number;
  status: NodeStatus;
  lastHeartbeat?: string;
  createdAt?: string;
}

export interface Task {
  id: string;
  type: TaskType;
  input: TaskInput;
  output?: any;
  requirements: TaskRequirements;
  status: TaskStatus;
  assignedNodeId?: string;
  creatorId?: string;
  pointsCost: number;
  createdAt: string;
  assignedAt?: string;
  completedAt?: string;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  taskId?: string;
  description: string;
  createdAt: string;
}

export interface Statistics {
  nodes: {
    total: number;
    online: number;
  };
  tasks: {
    total: number;
    completed: number;
    pending: number;
  };
  points: {
    totalIncome: number;
    totalExpense: number;
  };
}

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface ApiKeyCreateResponse {
  id: string;
  name: string;
  key: string;
  keyPrefix: string;
  createdAt: string;
}

export const authService = {
  register: (email: string, password: string) =>
    api.post<{ success: boolean; data: { user: User; token: string } }>('/auth/register', {
      email,
      password,
    }),

  login: (email: string, password: string) =>
    api.post<{ success: boolean; data: { user: User; token: string } }>('/auth/login', {
      email,
      password,
    }),

  me: () => api.get<{ success: boolean; data: User }>('/auth/me'),
};

export const nodeService = {
  create: (data: Omit<Node, 'id' | 'status' | 'lastHeartbeat' | 'createdAt'>) =>
    api.post<{ success: boolean; data: Node }>('/nodes', data),

  list: () => api.get<{ success: boolean; data: Node[] }>('/nodes'),

  get: (id: string) => api.get<{ success: boolean; data: Node }>(`/nodes/${id}`),

  getOnline: (capability: NodeCapability) =>
    api.get<{ success: boolean; data: Node[] }>(`/nodes/online/${capability}`),
};

export const taskService = {
  create: (data: { type: TaskType; input: TaskInput; requirements: TaskRequirements }) =>
    api.post<{ success: boolean; data: Task }>('/tasks', data),

  list: () => api.get<{ success: boolean; data: Task[] }>('/tasks'),

  get: (id: string) => api.get<{ success: boolean; data: Task }>(`/tasks/${id}`),

  getPending: () => api.get<{ success: boolean; data: Task[] }>('/tasks/pending/list'),
};

export const walletService = {
  getBalance: () => api.get<{ success: boolean; data: { points: number } }>('/wallet/balance'),

  getTransactions: () =>
    api.get<{ success: boolean; data: Transaction[] }>('/wallet/transactions'),
};

export const adminService = {
  getStatistics: () => api.get<{ success: boolean; data: Statistics }>('/admin/statistics'),

  getAllNodes: () => api.get<{ success: boolean; data: Node[] }>('/admin/nodes'),

  getAllTasks: () => api.get<{ success: boolean; data: Task[] }>('/admin/tasks'),

  banNode: (nodeId: string) => api.post<{ success: boolean }>(`/admin/nodes/${nodeId}/ban`),

  cancelTask: (taskId: string) => api.post<{ success: boolean }>(`/admin/tasks/${taskId}/cancel`),
};

export const apiKeyService = {
  create: (name: string) =>
    api.post<{ success: boolean; data: ApiKeyCreateResponse }>('/api-keys', { name }),

  list: () => api.get<{ success: boolean; data: ApiKey[] }>('/api-keys'),

  delete: (id: string) => api.delete<{ success: boolean }>(`/api-keys/${id}`),
};

export default api;
