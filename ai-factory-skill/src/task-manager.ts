import { EventEmitter } from 'events';
import { AIFactoryClient } from './client';
import { StateMachine } from './state-machine';
import {
  AIFactoryConfig,
  PendingTask,
  TaskOutput,
  NodeCapability,
  TaskType,
  TASK_CAPABILITY_MAP,
  PollingConfig,
  TasksConfig
} from './types';

export interface TaskManagerEvents {
  'task:claimed': (task: PendingTask) => void;
  'task:completed': (taskId: string, result: TaskOutput) => void;
  'task:failed': (taskId: string, error: string) => void;
  'task:timeout': (taskId: string) => void;
  'poll:start': () => void;
  'poll:end': (count: number) => void;
  'error': (error: Error) => void;
}

interface ActiveTask {
  task: PendingTask;
  startTime: Date;
  timeoutId: NodeJS.Timeout;
}

export class TaskManager extends EventEmitter {
  private client: AIFactoryClient;
  private stateMachine: StateMachine;
  private config: AIFactoryConfig;
  private pollingConfig: PollingConfig;
  private tasksConfig: TasksConfig;
  private pollingInterval: NodeJS.Timeout | null = null;
  private activeTasks: Map<string, ActiveTask> = new Map();
  private isRunning: boolean = false;
  private consecutiveErrors: number = 0;
  private maxConsecutiveErrors: number = 5;

  constructor(
    client: AIFactoryClient,
    stateMachine: StateMachine,
    config: AIFactoryConfig
  ) {
    super();
    this.client = client;
    this.stateMachine = stateMachine;
    this.config = config;
    this.pollingConfig = config.polling || {
      interval: 10,
      minInterval: 3
    };
    this.tasksConfig = config.tasks || {
      maxConcurrent: 3,
      timeout: 600,
      autoRelease: true
    };
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[TaskManager] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[TaskManager] Starting task manager...');

    // Start polling loop
    await this.poll();
    this.scheduleNextPoll();
  }

  stop(): void {
    console.log('[TaskManager] Stopping task manager...');
    this.isRunning = false;

    if (this.pollingInterval) {
      clearTimeout(this.pollingInterval);
      this.pollingInterval = null;
    }

    // Clear all active task timeouts
    for (const [taskId, activeTask] of this.activeTasks) {
      clearTimeout(activeTask.timeoutId);
    }
    this.activeTasks.clear();

    this.stateMachine.shutdown();
    console.log('[TaskManager] Task manager stopped');
  }

  private scheduleNextPoll(): void {
    if (!this.isRunning) return;

    const interval = this.pollingConfig.interval * 1000;
    this.pollingInterval = setTimeout(async () => {
      await this.poll();
      this.scheduleNextPoll();
    }, interval);
  }

  private async poll(): Promise<void> {
    if (!this.stateMachine.canPoll()) {
      console.log('[TaskManager] Cannot poll in current state:', this.stateMachine.getStatus());
      return;
    }

    try {
      this.emit('poll:start');
      this.stateMachine.startPolling();

      console.log('[TaskManager] Polling for tasks...');
      const pendingTasks = await this.client.getPendingTasks();
      this.emit('poll:end', pendingTasks.length);

      if (pendingTasks.length === 0) {
        console.log('[TaskManager] No pending tasks found');
        this.stateMachine.stopPolling();
        return;
      }

      console.log(`[TaskManager] Found ${pendingTasks.length} pending tasks`);

      // Filter and sort tasks based on capabilities
      const suitableTasks = this.filterSuitableTasks(pendingTasks);
      console.log(`[TaskManager] ${suitableTasks.length} tasks match capabilities`);

      // Try to claim tasks
      for (const task of suitableTasks) {
        if (!this.stateMachine.canAcceptTask()) {
          console.log('[TaskManager] Max concurrent tasks reached');
          break;
        }

        const claimed = await this.tryClaimTask(task);
        if (claimed) {
          this.emit('task:claimed', task);
        }
      }

      this.consecutiveErrors = 0;
      this.stateMachine.clearError();

    } catch (error) {
      console.error('[TaskManager] Poll error:', error);
      this.consecutiveErrors++;
      this.stateMachine.setError(error instanceof Error ? error.message : 'Unknown error');

      if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
        console.error('[TaskManager] Too many consecutive errors, stopping polling');
        this.stateMachine.setUnavailable('Too many consecutive errors');
        this.emit('error', new Error('Max consecutive errors reached'));
      }

      this.emit('error', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private filterSuitableTasks(tasks: PendingTask[]): PendingTask[] {
    const capabilities = this.config.capabilities || [];

    return tasks.filter(task => {
      const requiredCapability = TASK_CAPABILITY_MAP[task.type];

      // If no specific capability required, accept
      if (!requiredCapability) {
        return true;
      }

      // Check if we have the required capability
      return capabilities.includes(requiredCapability);
    }).sort((a, b) => {
      // Sort by points cost (higher first) and creation time (older first)
      if (b.pointsCost !== a.pointsCost) {
        return b.pointsCost - a.pointsCost;
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }

  private async tryClaimTask(task: PendingTask): Promise<boolean> {
    try {
      // Try to claim the task
      const claimed = await this.client.claimTask(task.id);

      if (!claimed) {
        console.log(`[TaskManager] Failed to claim task ${task.id} (already claimed)`);
        return false;
      }

      // Add to active tasks and set timeout
      if (!this.stateMachine.addTask(task.id)) {
        console.log(`[TaskManager] Cannot accept task ${task.id}`);
        return false;
      }

      this.startTaskTimeout(task);
      console.log(`[TaskManager] Successfully claimed task ${task.id}`);

      // Execute the task
      this.executeTask(task);

      return true;
    } catch (error) {
      console.error(`[TaskManager] Error claiming task ${task.id}:`, error);
      this.stateMachine.removeTask(task.id);
      return false;
    }
  }

  private startTaskTimeout(task: PendingTask): void {
    if (!this.tasksConfig.autoRelease) return;

    const timeoutMs = this.tasksConfig.timeout * 1000;
    const timeoutId = setTimeout(() => {
      this.handleTaskTimeout(task.id);
    }, timeoutMs);

    this.activeTasks.set(task.id, {
      task,
      startTime: new Date(),
      timeoutId
    });

    console.log(`[TaskManager] Task ${task.id} timeout set for ${this.tasksConfig.timeout}s`);
  }

  private handleTaskTimeout(taskId: string): void {
    const activeTask = this.activeTasks.get(taskId);
    if (!activeTask) {
      console.log(`[TaskManager] Task ${taskId} not found in active tasks (already completed?)`);
      return;
    }

    console.log(`[TaskManager] Task ${taskId} timed out after ${this.tasksConfig.timeout}s`);

    // Remove from active tasks
    this.activeTasks.delete(taskId);
    this.stateMachine.removeTask(taskId);

    // Emit timeout event
    this.emit('task:timeout', taskId);
  }

  private async executeTask(task: PendingTask): Promise<void> {
    const startTime = Date.now();

    try {
      console.log(`[TaskManager] Executing task ${task.id} (type: ${task.type})`);

      // Get the handler for this task type
      const handler = this.config.handlers?.[task.type];

      if (!handler) {
        throw new Error(`No handler registered for task type: ${task.type}`);
      }

      // Execute the task
      const result = await handler(task.input, task.requirements);

      // Submit the result
      const submitted = await this.client.submitTaskResult(task.id, result);

      if (submitted) {
        const duration = Date.now() - startTime;
        console.log(`[TaskManager] Task ${task.id} completed in ${duration}ms`);
        this.emit('task:completed', task.id, result);
      } else {
        throw new Error('Failed to submit task result');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[TaskManager] Task ${task.id} failed:`, errorMessage);

      // Submit error result
      await this.client.submitTaskResult(task.id, {
        error: errorMessage
      });

      this.emit('task:failed', task.id, errorMessage);
    } finally {
      // Clean up
      this.clearTaskTimeout(task.id);
      this.stateMachine.removeTask(task.id);
    }
  }

  private clearTaskTimeout(taskId: string): void {
    const activeTask = this.activeTasks.get(taskId);
    if (activeTask) {
      clearTimeout(activeTask.timeoutId);
      this.activeTasks.delete(taskId);
    }
  }

  getActiveTaskCount(): number {
    return this.activeTasks.size;
  }

  getAvailableSlots(): number {
    return this.stateMachine.getAvailableSlots();
  }

  isTaskActive(taskId: string): boolean {
    return this.activeTasks.has(taskId);
  }
}
