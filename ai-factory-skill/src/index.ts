import { EventEmitter } from 'events';
import { AIFactoryClient } from './client';
import { StateMachine } from './state-machine';
import { TaskManager } from './task-manager';
import { defaultHandlers } from './task-handlers';
import {
  AIFactoryConfig,
  AIFactoryMetrics,
  TaskOutput,
  PendingTask,
  DEFAULT_POLLING_CONFIG,
  DEFAULT_TASKS_CONFIG,
  DEFAULT_AUTO_PUBLISH_CONFIG
} from './types';

export class AIFactorySkill extends EventEmitter {
  private client: AIFactoryClient;
  private stateMachine: StateMachine;
  private taskManager: TaskManager;
  private config: AIFactoryConfig;
  private metrics: AIFactoryMetrics;
  private isRunning: boolean = false;

  constructor(config: AIFactoryConfig) {
    super();

    // Validate required configuration
    if (!config.apiKey) {
      throw new Error('API key is required');
    }

    // Merge with defaults
    this.config = {
      ...config,
      polling: { ...DEFAULT_POLLING_CONFIG, ...config.polling },
      tasks: { ...DEFAULT_TASKS_CONFIG, ...config.tasks },
      autoPublish: { ...DEFAULT_AUTO_PUBLISH_CONFIG, ...config.autoPublish },
      handlers: { ...defaultHandlers, ...config.handlers }
    };

    // Initialize components
    const baseURL = this.config.platformUrl
      ? `${this.config.platformUrl}/api`
      : 'http://localhost:3001/api';

    this.client = new AIFactoryClient(this.config.apiKey, baseURL);
    this.stateMachine = new StateMachine(this.config.tasks!);
    this.taskManager = new TaskManager(this.client, this.stateMachine, this.config);

    // Initialize metrics
    this.metrics = {
      pollingCount: 0,
      taskClaimSuccess: 0,
      taskClaimFailed: 0,
      taskCompleted: 0,
      taskTimeout: 0,
      pointsBalance: 0
    };

    // Setup event forwarding
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Forward task manager events
    this.taskManager.on('task:claimed', (task: PendingTask) => {
      this.metrics.taskClaimSuccess++;
      this.emit('task:claimed', task);
    });

    this.taskManager.on('task:completed', (taskId: string, result: TaskOutput) => {
      this.metrics.taskCompleted++;
      this.emit('task:completed', taskId, result);
    });

    this.taskManager.on('task:failed', (taskId: string, error: string) => {
      this.metrics.taskClaimFailed++;
      this.emit('task:failed', taskId, error);
    });

    this.taskManager.on('task:timeout', (taskId: string) => {
      this.metrics.taskTimeout++;
      this.emit('task:timeout', taskId);
    });

    this.taskManager.on('poll:start', () => {
      this.metrics.pollingCount++;
      this.emit('poll:start');
    });

    this.taskManager.on('poll:end', (count: number) => {
      this.emit('poll:end', count);
    });

    this.taskManager.on('error', (error: Error) => {
      this.emit('error', error);
    });

    // Forward state machine events
    this.stateMachine.on('state:change', (from, to) => {
      this.emit('state:change', from, to);
    });

    this.stateMachine.on('task:add', (taskId: string) => {
      this.emit('task:add', taskId);
    });

    this.stateMachine.on('task:remove', (taskId: string) => {
      this.emit('task:remove', taskId);
    });
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[AIFactorySkill] Already running');
      return;
    }

    console.log('[AIFactorySkill] Starting AI Factory Skill...');

    try {
      // Verify connection
      const connected = await this.client.verifyConnection();
      if (!connected) {
        throw new Error('Failed to connect to AI Factory platform');
      }

      // Get initial balance
      const balance = await this.client.getBalance();
      this.metrics.pointsBalance = balance;
      console.log(`[AIFactorySkill] Connected. Balance: ${balance} points`);

      // Start task manager
      await this.taskManager.start();

      this.isRunning = true;
      console.log('[AIFactorySkill] AI Factory Skill started successfully');

      this.emit('started');
    } catch (error) {
      console.error('[AIFactorySkill] Failed to start:', error);
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('[AIFactorySkill] Not running');
      return;
    }

    console.log('[AIFactorySkill] Stopping AI Factory Skill...');

    this.taskManager.stop();
    this.isRunning = false;

    console.log('[AIFactorySkill] AI Factory Skill stopped');
    this.emit('stopped');
  }

  // Task publishing methods
  async publishTextSummaryTask(
    content: string,
    maxLength?: number,
    deadline: number = 3600
  ): Promise<string | null> {
    return this.client.createTask(
      'text_summary',
      { content },
      { maxLength, deadline }
    );
  }

  async publishTranslationTask(
    text: string,
    targetLanguage: string,
    sourceLanguage?: string,
    deadline: number = 3600
  ): Promise<string | null> {
    return this.client.createTask(
      'translation',
      { text, sourceLanguage, targetLanguage },
      { deadline }
    );
  }

  async publishImageGenerationTask(
    content: string,
    imageCount: number = 1,
    imageSize?: string,
    deadline: number = 3600
  ): Promise<string | null> {
    return this.client.createTask(
      'image_generation',
      { content, imageCount, imageSize },
      { imageCount, deadline }
    );
  }

  async publishDataConversionTask(
    content: string,
    inputFormat?: 'excel' | 'csv' | 'json',
    outputFormat: 'csv' | 'json' = 'json',
    deadline: number = 3600
  ): Promise<string | null> {
    return this.client.createTask(
      'data_conversion',
      { content, inputFormat, outputFormat },
      { deadline }
    );
  }

  // Metrics and status methods
  getMetrics(): AIFactoryMetrics {
    return { ...this.metrics };
  }

  getStatus(): {
    isRunning: boolean;
    state: string;
    activeTasks: number;
    availableSlots: number;
    balance: number;
  } {
    return {
      isRunning: this.isRunning,
      state: this.stateMachine.getStatus(),
      activeTasks: this.taskManager.getActiveTaskCount(),
      availableSlots: this.taskManager.getAvailableSlots(),
      balance: this.metrics.pointsBalance
    };
  }

  async refreshBalance(): Promise<number> {
    const balance = await this.client.getBalance();
    this.metrics.pointsBalance = balance;
    return balance;
  }

  // Event handlers for custom task processing
  onTaskClaimed(handler: (task: PendingTask) => void): void {
    this.on('task:claimed', handler);
  }

  onTaskCompleted(handler: (taskId: string, result: TaskOutput) => void): void {
    this.on('task:completed', handler);
  }

  onTaskFailed(handler: (taskId: string, error: string) => void): void {
    this.on('task:failed', handler);
  }

  onTaskTimeout(handler: (taskId: string) => void): void {
    this.on('task:timeout', handler);
  }

  onStateChange(handler: (from: string, to: string) => void): void {
    this.on('state:change', handler);
  }

  onError(handler: (error: Error) => void): void {
    this.on('error', handler);
  }

  onPollCycle(handler: (taskCount: number) => void): void {
    this.on('poll:end', handler);
  }
}

// Export types for convenience
export * from './types';
export * from './client';
export * from './state-machine';
export * from './task-manager';
export * from './task-handlers';
