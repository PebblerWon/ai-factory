import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import {
  getAllNodes,
  getAllTasks,
  getStatistics,
  banNode,
  cancelTask,
  updateUserPoints,
  createUser,
  getUserById
} from '../sqlite';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);
router.use(adminMiddleware);

const createAdminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

router.post('/admin', async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = createAdminSchema.parse(req.body);

    const passwordHash = await bcrypt.hash(password, 10);
    const adminId = uuidv4();

    createUser(adminId, email, passwordHash, 'admin');

    res.json({
      success: true,
      data: { id: adminId, email, role: 'admin' }
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ success: false, error: 'Failed to create admin' });
  }
});

router.get('/nodes', (req: AuthRequest, res: Response) => {
  try {
    const nodes = getAllNodes() as any[];

    res.json({
      success: true,
      data: nodes.map(node => ({
        id: node.id,
        userId: node.user_id,
        nodeName: node.node_name,
        capabilities: JSON.parse(node.capabilities),
        modelVersions: JSON.parse(node.model_versions),
        status: node.status,
        lastHeartbeat: node.last_heartbeat,
        createdAt: node.created_at,
      }))
    });
  } catch (error) {
    console.error('Get all nodes error:', error);
    res.status(500).json({ success: false, error: 'Failed to get nodes' });
  }
});

router.get('/tasks', (req: AuthRequest, res: Response) => {
  try {
    const tasks = getAllTasks() as any[];

    res.json({
      success: true,
      data: tasks.map(task => ({
        id: task.id,
        type: task.type,
        status: task.status,
        creatorId: task.creator_id,
        assignedNodeId: task.assigned_node_id,
        pointsCost: task.points_cost,
        createdAt: task.created_at,
        completedAt: task.completed_at,
      }))
    });
  } catch (error) {
    console.error('Get all tasks error:', error);
    res.status(500).json({ success: false, error: 'Failed to get tasks' });
  }
});

router.get('/statistics', (req: AuthRequest, res: Response) => {
  try {
    const stats = getStatistics();

    res.json({
      success: true,
      data: {
        nodes: {
          total: stats.nodes.total || 0,
          online: stats.nodes.online || 0,
        },
        tasks: {
          total: stats.tasks.total || 0,
          completed: stats.tasks.completed || 0,
          pending: stats.tasks.pending || 0,
        },
        points: {
          totalIncome: stats.points.total_income || 0,
          totalExpense: stats.points.total_expense || 0,
        }
      }
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({ success: false, error: 'Failed to get statistics' });
  }
});

router.post('/nodes/:id/ban', (req: AuthRequest, res: Response) => {
  try {
    banNode(req.params.id);

    res.json({
      success: true,
      message: 'Node banned successfully'
    });
  } catch (error) {
    console.error('Ban node error:', error);
    res.status(500).json({ success: false, error: 'Failed to ban node' });
  }
});

router.post('/tasks/:id/cancel', (req: AuthRequest, res: Response) => {
  try {
    cancelTask(req.params.id);

    res.json({
      success: true,
      message: 'Task cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel task error:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel task' });
  }
});

router.post('/users/:id/points', (req: AuthRequest, res: Response) => {
  try {
    const { amount } = req.body;

    if (typeof amount !== 'number') {
      return res.status(400).json({ success: false, error: 'Invalid amount' });
    }

    updateUserPoints(req.params.id, amount);

    res.json({
      success: true,
      message: 'Points updated successfully'
    });
  } catch (error) {
    console.error('Update points error:', error);
    res.status(500).json({ success: false, error: 'Failed to update points' });
  }
});

export default router;
