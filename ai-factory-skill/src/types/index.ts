// Task types
export type TaskType = 'text_summary' | 'translation' | 'image_generation' | 'data_conversion';
export type TaskStatus = 'pending' | 'assigned' | 'processing' | 'completed' | 'rejected' | 'cancelled';
export type NodeCapability = 'llm' | 'image_gen';
export type NodeStatus = 'idle' | 'polling' | 'busy' | 'unavailable';

// Task interfaces
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

export interface Task {
  id: string;
  type: TaskType;
  input: TaskInput;
  output?: TaskOutput;
  requirements: TaskRequirements;
  status: TaskStatus;
  assignedNodeId?: string;
  creatorId: string;
  createdAt: string;
  assignedAt?: string;
  completedAt?: string;
  pointsCost: number;
}

export interface PendingTask {
  id: string;
  type: TaskType;
  input: TaskInput;
  requirements: TaskRequirements;
  pointsCost: number;
  createdAt: string;
}

// API interfaces
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface BalanceResponse {
  points: number;
}

export interface ClaimResponse {
  success: boolean;
  error?: string;
}

export interface SubmitResponse {
  success: boolean;
  error?: string;
}

// Configuration interfaces
export interface PollingConfig {
  interval: number;
  minInterval: number;
}

export interface TasksConfig {
  maxConcurrent: number;
  timeout: number;
  autoRelease: boolean;
}

export interface AutoPublishConfig {
  enabled: boolean;
  minPoints: number;
  maxTasksInQueue: number;
}

export interface AIFactoryConfig {
  apiKey: string;
  platformUrl?: string;
  polling?: PollingConfig;
  tasks?: TasksConfig;
  capabilities?: NodeCapability[];
  autoPublish?: AutoPublishConfig;
  handlers?: TaskHandlers;
}

export interface TaskHandlers {
  text_summary?: TaskHandler;
  translation?: TaskHandler;
  image_generation?: TaskHandler;
  data_conversion?: TaskHandler;
}

export type TaskHandler = (
  input: TaskInput,
  requirements: TaskRequirements
) => Promise<TaskOutput>;

// State machine interfaces
export interface StateTransition {
  from: NodeStatus;
  to: NodeStatus;
  event: string;
}

export interface NodeState {
  status: NodeStatus;
  currentTasks: Set<string>;
  lastPollTime?: Date;
  lastError?: string;
}

// Event interfaces
export interface TaskClaimedEvent {
  task: Task;
  timestamp: Date;
}

export interface TaskCompletedEvent {
  task: Task;
  result: TaskOutput;
  duration: number;
  timestamp: Date;
}

export interface TaskTimeoutEvent {
  task: Task;
  timeout: number;
  timestamp: Date;
}

export interface PointsLowEvent {
  balance: number;
  threshold: number;
  timestamp: Date;
}

// Metrics interfaces
export interface AIFactoryMetrics {
  pollingCount: number;
  taskClaimSuccess: number;
  taskClaimFailed: number;
  taskCompleted: number;
  taskTimeout: number;
  pointsBalance: number;
}

// Default configurations
export const DEFAULT_POLLING_CONFIG: PollingConfig = {
  interval: 10,
  minInterval: 3
};

export const DEFAULT_TASKS_CONFIG: TasksConfig = {
  maxConcurrent: 3,
  timeout: 600,
  autoRelease: true
};

export const DEFAULT_AUTO_PUBLISH_CONFIG: AutoPublishConfig = {
  enabled: false,
  minPoints: 50,
  maxTasksInQueue: 2
};

// Task type to capability mapping
export const TASK_CAPABILITY_MAP: Record<TaskType, NodeCapability | null> = {
  text_summary: 'llm',
  translation: 'llm',
  image_generation: 'image_gen',
  data_conversion: null
};

// Points cost mapping
export const TASK_POINTS: Record<TaskType, number> = {
  text_summary: 10,
  translation: 15,
  image_generation: 25,
  data_conversion: 12
};

// Task type labels
export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  text_summary: 'Text Summary',
  translation: 'Translation',
  image_generation: 'Image Generation',
  data_conversion: 'Data Conversion'
};
