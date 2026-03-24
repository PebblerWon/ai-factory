import { EventEmitter } from 'events';
import { NodeStatus, TasksConfig } from './types';

export interface StateMachineState {
  status: NodeStatus;
  currentTasks: Set<string>;
  lastPollTime?: Date;
  lastError?: string;
}

export interface StateMachineEvents {
  'state:change': (from: NodeStatus, to: NodeStatus) => void;
  'task:add': (taskId: string) => void;
  'task:remove': (taskId: string) => void;
  'error': (error: Error) => void;
}

export class StateMachine extends EventEmitter {
  private state: StateMachineState;
  private config: TasksConfig;
  private isShuttingDown: boolean = false;

  constructor(config: TasksConfig) {
    super();
    this.config = config;
    this.state = {
      status: 'idle',
      currentTasks: new Set()
    };
  }

  getStatus(): NodeStatus {
    return this.state.status;
  }

  getCurrentTasks(): Set<string> {
    return new Set(this.state.currentTasks);
  }

  getCurrentTaskCount(): number {
    return this.state.currentTasks.size;
  }

  canAcceptTask(): boolean {
    return this.state.currentTasks.size < this.config.maxConcurrent &&
           this.state.status !== 'unavailable';
  }

  canPoll(): boolean {
    return this.state.status === 'polling' || this.state.status === 'idle';
  }

  startPolling(): boolean {
    if (this.isShuttingDown) return false;

    const from = this.state.status;
    this.state.status = 'polling';
    this.state.lastPollTime = new Date();
    this.emit('state:change', from, this.state.status);
    return true;
  }

  stopPolling(): void {
    if (this.state.status === 'polling') {
      const from = this.state.status;
      this.state.status = 'idle';
      this.emit('state:change', from, this.state.status);
    }
  }

  addTask(taskId: string): boolean {
    if (!this.canAcceptTask()) {
      console.log(`[StateMachine] Cannot accept task ${taskId}. Current: ${this.getCurrentTaskCount()}/${this.config.maxConcurrent}`);
      return false;
    }

    this.state.currentTasks.add(taskId);
    this.emit('task:add', taskId);

    // Transition to busy if needed
    if (this.state.status === 'polling' || this.state.status === 'idle') {
      const from = this.state.status;
      this.state.status = 'busy';
      this.emit('state:change', from, this.state.status);
    }

    return true;
  }

  removeTask(taskId: string): void {
    this.state.currentTasks.delete(taskId);
    this.emit('task:remove', taskId);

    // Transition to idle if no more tasks
    if (this.state.currentTasks.size === 0) {
      const from = this.state.status;
      this.state.status = 'idle';
      this.emit('state:change', from, this.state.status);
    }
  }

  setUnavailable(error?: string): void {
    const from = this.state.status;
    this.state.status = 'unavailable';
    this.state.lastError = error;
    this.emit('state:change', from, this.state.status);
    if (error) {
      this.emit('error', new Error(error));
    }
  }

  setError(error: string): void {
    this.state.lastError = error;
    this.emit('error', new Error(error));
  }

  clearError(): void {
    this.state.lastError = undefined;
  }

  shutdown(): void {
    this.isShuttingDown = true;
    const from = this.state.status;
    this.state.status = 'unavailable';
    this.emit('state:change', from, this.state.status);
  }

  getState(): StateMachineState {
    return {
      status: this.state.status,
      currentTasks: new Set(this.state.currentTasks),
      lastPollTime: this.state.lastPollTime,
      lastError: this.state.lastError
    };
  }

  isTaskRunning(taskId: string): boolean {
    return this.state.currentTasks.has(taskId);
  }

  getAvailableSlots(): number {
    return Math.max(0, this.config.maxConcurrent - this.state.currentTasks.size);
  }

  shouldStopPolling(): boolean {
    return !this.canPoll() ||
           !this.canAcceptTask() ||
           this.isShuttingDown ||
           this.state.status === 'unavailable';
  }

  reset(): void {
    this.state.status = 'idle';
    this.state.currentTasks.clear();
    this.state.lastPollTime = undefined;
    this.state.lastError = undefined;
    this.isShuttingDown = false;
  }
}
