export type TaskType = 'text_summary' | 'translation' | 'image_generation' | 'data_conversion';
export type NodeStatus = 'online' | 'offline' | 'busy';
export type TaskStatus = 'pending' | 'assigned' | 'processing' | 'completed' | 'rejected' | 'cancelled';
export type NodeCapability = 'llm' | 'image_gen';
export type UserRole = 'user' | 'node' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}

export interface UserProfile extends User {
  points: number;
}

export interface Node {
  id: string;
  userId: string;
  nodeName: string;
  capabilities: NodeCapability[];
  modelVersions: string[];
  availableHours: { start: number; end: number };
  loadThreshold: number;
  status: NodeStatus;
  lastHeartbeat: Date;
  createdAt: Date;
}

export interface Task {
  id: string;
  type: TaskType;
  input: TaskInput;
  output: TaskOutput;
  requirements: TaskRequirements;
  status: TaskStatus;
  assignedNodeId?: string;
  creatorId: string;
  createdAt: Date;
  assignedAt?: Date;
  completedAt?: Date;
  pointsCost: number;
}

export interface TaskInput {
  content?: string;
  text?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  imageStyles?: string[];
  imageCount?: number;
  imageSize?: string;
  inputFormat?: 'excel' | 'csv' | 'json';
  outputFormat?: 'csv' | 'json';
}

export interface TaskOutput {
  result?: string;
  images?: string[];
  convertedData?: string;
  error?: string;
}

export interface TaskRequirements {
  format?: string;
  maxLength?: number;
  imageCount?: number;
  deadline: number;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'income' | 'expense';
  amount: number;
  taskId?: string;
  description: string;
  createdAt: Date;
}

export interface HeartbeatPayload {
  nodeId: string;
  status: NodeStatus;
  currentLoad: number;
  timestamp: Date;
}

export interface AssignmentPayload {
  taskId: string;
  input: TaskInput;
  requirements: TaskRequirements;
}

export interface SubmissionPayload {
  taskId: string;
  result: TaskOutput;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export const TASK_POINTS: Record<TaskType, number> = {
  text_summary: 10,
  translation: 15,
  image_generation: 25,
  data_conversion: 12,
};

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  text_summary: '文本总结',
  translation: '翻译',
  image_generation: '图片生成',
  data_conversion: '数据格式转换',
};

export const CONTENT_FILTER_KEYWORDS = [
  'violence', 'porn', 'political', 'drug', 'gambling'
];

export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  keyPrefix: string;
  createdAt: Date;
  lastUsedAt?: Date;
  expiresAt?: Date;
}

export interface ApiKeyCreateResponse {
  id: string;
  name: string;
  key: string;
  keyPrefix: string;
  createdAt: Date;
}

export interface ApiKeyListItem {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: Date;
  lastUsedAt?: Date;
}
