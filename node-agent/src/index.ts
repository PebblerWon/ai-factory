import axios, { AxiosInstance } from 'axios';

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
  private config: NodeConfig;
  private apiKey: string;
  private taskHandler: TaskHandler;
  private pollingInterval: NodeJS.Timeout | null = null;
  private pollingIntervalMs: number = 10000;
  private minPollingIntervalMs: number = 3000;
  private maxConcurrentTasks: number = 3;
  private taskTimeoutMs: number = 600000;
  private autoReleaseTimeout: boolean = true;
  private activeTasks: Map<string, { startTime: number; timeoutId: NodeJS.Timeout }> = new Map();
  private serverUrl: string;
  private client: AxiosInstance;
  private isRunning: boolean = false;
  private maxRetries: number = 5;
  private retryDelays: number[] = [5000, 10000, 20000, 40000, 60000];

  constructor(config: {
    nodeId: string;
    nodeName: string;
    capabilities: ('llm' | 'image_gen')[];
    modelVersions: string[];
    availableHours?: { start: number; end: number };
    loadThreshold?: number;
    apiKey: string;
    taskHandler: TaskHandler;
    serverUrl?: string;
    pollingInterval?: number;
    maxConcurrentTasks?: number;
    taskTimeout?: number;
    autoReleaseTimeout?: boolean;
  }) {
    this.config = {
      nodeId: config.nodeId,
      nodeName: config.nodeName,
      capabilities: config.capabilities,
      modelVersions: config.modelVersions,
      availableHours: config.availableHours || { start: 0, end: 24 },
      loadThreshold: config.loadThreshold || 80,
    };

    this.apiKey = config.apiKey;
    this.taskHandler = config.taskHandler;
    this.serverUrl = config.serverUrl || 'http://localhost:3001';

    if (config.pollingInterval && config.pollingInterval >= this.minPollingIntervalMs) {
      this.pollingIntervalMs = config.pollingInterval;
    }

    if (config.maxConcurrentTasks) {
      this.maxConcurrentTasks = config.maxConcurrentTasks;
    }

    if (config.taskTimeout) {
      this.taskTimeoutMs = config.taskTimeout * 1000;
    }

    if (config.autoReleaseTimeout !== undefined) {
      this.autoReleaseTimeout = config.autoReleaseTimeout;
    }

    this.client = axios.create({
      baseURL: this.serverUrl,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[NodeAgent] Already running');
      return;
    }

    console.log('[NodeAgent] Starting node agent...');

    try {
      const balance = await this.getBalance();
      console.log(`[NodeAgent] Connected. Balance: ${balance} points`);

      this.isRunning = true;
      console.log(`[NodeAgent] Starting polling with ${this.pollingIntervalMs}ms interval`);

      await this.poll();
      this.scheduleNextPoll();

    } catch (error) {
      console.error('[NodeAgent] Failed to start:', error);
      throw error;
    }
  }

  stop(): void {
    console.log('[NodeAgent] Stopping node agent...');

    this.isRunning = false;

    if (this.pollingInterval) {
      clearTimeout(this.pollingInterval);
      this.pollingInterval = null;
    }

    for (const [taskId, taskInfo] of this.activeTasks) {
      clearTimeout(taskInfo.timeoutId);
      console.log(`[NodeAgent] Cleared timeout for task ${taskId}`);
    }

    this.activeTasks.clear();
    console.log('[NodeAgent] Node agent stopped');
  }

  private scheduleNextPoll(): void {
    if (!this.isRunning) return;

    this.pollingInterval = setTimeout(async () => {
      await this.poll();
      this.scheduleNextPoll();
    }, this.pollingIntervalMs);
  }

  private async poll(): Promise<void> {
    if (!this.isRunning) return;

    if (this.activeTasks.size >= this.maxConcurrentTasks) {
      console.log(`[NodeAgent] Max concurrent tasks reached (${this.activeTasks.size}/${this.maxConcurrentTasks}), skipping poll`);
      return;
    }

    try {
      console.log('[NodeAgent] Polling for tasks...');
      const pendingTasks = await this.getPendingTasks();

      if (pendingTasks.length === 0) {
        console.log('[NodeAgent] No pending tasks found');
        return;
      }

      console.log(`[NodeAgent] Found ${pendingTasks.length} pending tasks`);

      const availableSlots = this.maxConcurrentTasks - this.activeTasks.size;
      const tasksToClaim = pendingTasks.slice(0, availableSlots);

      for (const task of tasksToClaim) {
        if (this.activeTasks.size >= this.maxConcurrentTasks) {
          console.log('[NodeAgent] Max concurrent tasks reached');
          break;
        }

        const claimed = await this.tryClaimTask(task);
        if (claimed) {
          await this.executeTask(task);
        }
      }

    } catch (error) {
      console.error('[NodeAgent] Poll error:', error);
    }
  }

  private async getPendingTasks(): Promise<Task[]> {
    try {
      const response = await this.client.get('/api/tasks/pending/list');
      if (response.data.success) {
        return response.data.data || [];
      }
      return [];
    } catch (error) {
      console.error('[NodeAgent] Failed to get pending tasks:', error);
      return [];
    }
  }

  private async tryClaimTask(task: Task): Promise<boolean> {
    try {
      const response = await this.client.post(`/api/tasks/${task.id}/claim`);

      if (response.data.success) {
        console.log(`[NodeAgent] Successfully claimed task ${task.id}`);
        return true;
      } else {
        console.log(`[NodeAgent] Failed to claim task ${task.id}: ${response.data.error}`);
        return false;
      }
    } catch (error: any) {
      if (error.response?.status === 409) {
        console.log(`[NodeAgent] Task ${task.id} already claimed by another node`);
        return false;
      }
      console.error(`[NodeAgent] Error claiming task ${task.id}:`, error);
      return false;
    }
  }

  private async executeTask(task: Task): Promise<void> {
    if (this.autoReleaseTimeout) {
      const timeoutId = setTimeout(() => {
        this.handleTaskTimeout(task.id);
      }, this.taskTimeoutMs);

      this.activeTasks.set(task.id, {
        startTime: Date.now(),
        timeoutId,
      });

      console.log(`[NodeAgent] Task ${task.id} timeout set for ${this.taskTimeoutMs}ms`);
    }

    try {
      console.log(`[NodeAgent] Executing task ${task.id} of type ${task.type}`);

      const result = await this.taskHandler(task);

      const submitted = await this.submitTaskResult(task.id, result);

      if (submitted) {
        console.log(`[NodeAgent] Task ${task.id} completed successfully`);
      } else {
        console.error(`[NodeAgent] Failed to submit result for task ${task.id}`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[NodeAgent] Task ${task.id} execution failed:`, errorMessage);

      await this.submitTaskResult(task.id, { error: errorMessage });
    } finally {
      this.clearTaskTimeout(task.id);
    }
  }

  private handleTaskTimeout(taskId: string): void {
    if (!this.activeTasks.has(taskId)) {
      console.log(`[NodeAgent] Task ${taskId} not found in active tasks (already completed?)`);
      return;
    }

    console.log(`[NodeAgent] Task ${taskId} timed out after ${this.taskTimeoutMs}ms`);

    this.activeTasks.delete(taskId);
    console.log(`[NodeAgent] Task ${taskId} released due to timeout`);
  }

  private clearTaskTimeout(taskId: string): void {
    const taskInfo = this.activeTasks.get(taskId);
    if (taskInfo) {
      clearTimeout(taskInfo.timeoutId);
      this.activeTasks.delete(taskId);
    }
  }

  private async submitTaskResult(
    taskId: string,
    result: any
  ): Promise<boolean> {
    try {
      const response = await this.client.post(`/api/tasks/${taskId}/submit`, result);

      if (response.data.success) {
        console.log(`[NodeAgent] Successfully submitted result for task ${taskId}`);
        return true;
      } else {
        console.error(`[NodeAgent] Failed to submit result for task ${taskId}: ${response.data.error}`);
        return false;
      }
    } catch (error) {
      console.error(`[NodeAgent] Error submitting result for task ${taskId}:`, error);
      return false;
    }
  }

  async getBalance(): Promise<number> {
    try {
      const response = await this.client.get('/api/wallet/balance');
      if (response.data.success) {
        return response.data.data.points;
      }
      throw new Error('Failed to get balance');
    } catch (error) {
      console.error('[NodeAgent] Failed to get balance:', error);
      throw error;
    }
  }

  getStatus(): {
    isRunning: boolean;
    activeTasks: number;
    availableSlots: number;
    pollingInterval: number;
  } {
    return {
      isRunning: this.isRunning,
      activeTasks: this.activeTasks.size,
      availableSlots: this.maxConcurrentTasks - this.activeTasks.size,
      pollingInterval: this.pollingIntervalMs,
    };
  }
}

export default NodeAgent;
