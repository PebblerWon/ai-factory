import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import {
  createTask,
  getTaskById,
  getTasksByCreatorId,
  getPendingTasks,
  getUserById,
  updateUserPoints,
  createTransaction,
} from '../sqlite';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { TASK_POINTS, CONTENT_FILTER_KEYWORDS, TaskType } from '@ai-factory/shared';

const router = Router();

const taskInputSchema = z.object({
  content: z.string().optional(),
  text: z.string().optional(),
  sourceLanguage: z.string().optional(),
  targetLanguage: z.string().optional(),
  imageStyles: z.array(z.string()).optional(),
  imageCount: z.number().optional(),
  imageSize: z.string().optional(),
  inputFormat: z.enum(['excel', 'csv', 'json']).optional(),
  outputFormat: z.enum(['csv', 'json']).optional(),
});

const createTaskSchema = z.object({
  type: z.enum(['text_summary', 'translation', 'image_generation', 'data_conversion']),
  input: taskInputSchema,
  requirements: z.object({
    format: z.string().optional(),
    maxLength: z.number().optional(),
    imageCount: z.number().optional(),
    deadline: z.number().min(1),
  }),
});

router.post('/', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { type, input, requirements } = createTaskSchema.parse(req.body);

    const inputStr = JSON.stringify(input);

    for (const keyword of CONTENT_FILTER_KEYWORDS) {
      const content = input.content || input.text || '';
      if (content.toLowerCase().includes(keyword)) {
        return res.status(400).json({
          success: false,
          error: 'Content contains prohibited keywords'
        });
      }
    }

    const user = getUserById(req.userId!) as any;
    const pointsCost = TASK_POINTS[type as TaskType];

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.points < pointsCost) {
      return res.status(400).json({
        success: false,
        error: `Insufficient points. Need ${pointsCost}, have ${user.points}`
      });
    }

    const taskId = uuidv4();
    createTask({
      id: taskId,
      type,
      input: inputStr,
      requirements: JSON.stringify(requirements),
      creatorId: req.userId!,
      pointsCost,
    });

    updateUserPoints(req.userId!, -pointsCost);

    createTransaction({
      id: uuidv4(),
      userId: req.userId!,
      type: 'expense',
      amount: pointsCost,
      taskId,
      description: `发布任务: ${type}`,
    });

    const task = getTaskById(taskId) as any;

    res.json({
      success: true,
      data: {
        id: task.id,
        type: task.type,
        status: task.status,
        pointsCost: task.points_cost,
        createdAt: task.created_at,
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors });
    }
    console.error('Create task error:', error);
    res.status(500).json({ success: false, error: 'Failed to create task' });
  }
});

router.get('/', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const tasks = getTasksByCreatorId(req.userId!) as any[];

    res.json({
      success: true,
      data: tasks.map(task => ({
        id: task.id,
        type: task.type,
        input: JSON.parse(task.input),
        output: task.output ? JSON.parse(task.output) : null,
        requirements: JSON.parse(task.requirements),
        status: task.status,
        assignedNodeId: task.assigned_node_id,
        pointsCost: task.points_cost,
        createdAt: task.created_at,
        assignedAt: task.assigned_at,
        completedAt: task.completed_at,
      }))
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ success: false, error: 'Failed to get tasks' });
  }
});

router.get('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const task = getTaskById(req.params.id) as any;

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    if (task.creator_id !== req.userId! && req.userRole !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    res.json({
      success: true,
      data: {
        id: task.id,
        type: task.type,
        input: JSON.parse(task.input),
        output: task.output ? JSON.parse(task.output) : null,
        requirements: JSON.parse(task.requirements),
        status: task.status,
        assignedNodeId: task.assigned_node_id,
        creatorId: task.creator_id,
        pointsCost: task.points_cost,
        createdAt: task.created_at,
        assignedAt: task.assigned_at,
        completedAt: task.completed_at,
      }
    });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ success: false, error: 'Failed to get task' });
  }
});

router.get('/pending/list', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== 'node' && req.userRole !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const tasks = getPendingTasks() as any[];

    res.json({
      success: true,
      data: tasks.map(task => ({
        id: task.id,
        type: task.type,
        input: JSON.parse(task.input),
        requirements: JSON.parse(task.requirements),
        pointsCost: task.points_cost,
        createdAt: task.created_at,
      }))
    });
  } catch (error) {
    console.error('Get pending tasks error:', error);
    res.status(500).json({ success: false, error: 'Failed to get pending tasks' });
  }
});

export default router;
