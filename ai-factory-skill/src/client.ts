import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  ApiResponse,
  BalanceResponse,
  ClaimResponse,
  SubmitResponse,
  PendingTask,
  Task,
  TaskInput,
  TaskRequirements,
  TaskType
} from './types';

export class AIFactoryClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(apiKey: string, baseURL: string = 'http://localhost:3001/api') {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      timeout: 30000
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[AIFactoryClient] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[AIFactoryClient] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiResponse>) => {
        if (error.response) {
          const { status, data } = error.response;
          console.error(`[AIFactoryClient] Error ${status}:`, data?.error || error.message);

          if (status === 401) {
            throw new Error('API authentication failed. Please check your API key.');
          }

          if (status === 403) {
            throw new Error('Access denied. Insufficient permissions.');
          }
        } else if (error.request) {
          console.error('[AIFactoryClient] Network error:', error.message);
          throw new Error('Network error. Please check your connection.');
        }

        return Promise.reject(error);
      }
    );
  }

  async getBalance(): Promise<number> {
    const response = await this.client.get<ApiResponse<BalanceResponse>>('/wallet/balance');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get balance');
    }
    return response.data.data.points;
  }

  async getPendingTasks(): Promise<PendingTask[]> {
    const response = await this.client.get<ApiResponse<PendingTask[]>>('/tasks/pending/list');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get pending tasks');
    }
    return response.data.data || [];
  }

  async getTask(taskId: string): Promise<Task> {
    const response = await this.client.get<ApiResponse<Task>>(`/tasks/${taskId}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get task');
    }
    return response.data.data;
  }

  async claimTask(taskId: string): Promise<boolean> {
    try {
      const response = await this.client.post<ApiResponse<ClaimResponse>>(`/tasks/${taskId}/claim`);

      if (!response.data.success) {
        console.log(`[AIFactoryClient] Failed to claim task ${taskId}:`, response.data.error);
        return false;
      }

      console.log(`[AIFactoryClient] Successfully claimed task ${taskId}`);
      return true;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        console.log(`[AIFactoryClient] Task ${taskId} already claimed by another node`);
        return false;
      }
      throw error;
    }
  }

  async submitTaskResult(
    taskId: string,
    result: {
      result?: string;
      images?: string[];
      convertedData?: string;
      error?: string;
    }
  ): Promise<boolean> {
    try {
      const response = await this.client.post<ApiResponse<SubmitResponse>>(
        `/tasks/${taskId}/submit`,
        result
      );

      if (!response.data.success) {
        console.error(`[AIFactoryClient] Failed to submit task ${taskId}:`, response.data.error);
        return false;
      }

      console.log(`[AIFactoryClient] Successfully submitted result for task ${taskId}`);
      return true;
    } catch (error) {
      console.error(`[AIFactoryClient] Error submitting task ${taskId}:`, error);
      return false;
    }
  }

  async createTask(
    type: TaskType,
    input: TaskInput,
    requirements: TaskRequirements
  ): Promise<string | null> {
    try {
      const response = await this.client.post<ApiResponse<{ id: string }>>('/tasks', {
        type,
        input,
        requirements
      });

      if (!response.data.success) {
        console.error(`[AIFactoryClient] Failed to create task:`, response.data.error);
        return null;
      }

      console.log(`[AIFactoryClient] Successfully created task ${response.data.data.id}`);
      return response.data.data.id;
    } catch (error) {
      console.error(`[AIFactoryClient] Error creating task:`, error);
      return null;
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.getBalance();
      console.log('[AIFactoryClient] Connection verified successfully');
      return true;
    } catch (error) {
      console.error('[AIFactoryClient] Connection verification failed:', error);
      return false;
    }
  }
}
