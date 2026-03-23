import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import {
  getNodesByUserId,
  getNodeById,
  createNode,
  getOnlineNodesByCapability,
  getAllNodes
} from '../sqlite';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

const createNodeSchema = z.object({
  nodeName: z.string().min(1).max(50),
  capabilities: z.array(z.enum(['llm', 'image_gen'])),
  modelVersions: z.array(z.string()),
  availableHours: z.object({
    start: z.number().min(0).max(23),
    end: z.number().min(0).max(23),
  }),
  loadThreshold: z.number().min(1).max(100).default(80),
});

router.post('/', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const data = createNodeSchema.parse(req.body);

    if (req.userRole !== 'node' && req.userRole !== 'admin') {
      return res.status(403).json({ success: false, error: 'Only nodes can register' });
    }

    const nodeId = uuidv4();
    createNode({
      id: nodeId,
      userId: req.userId!,
      ...data,
    });

    const node = getNodeById(nodeId) as any;

    res.json({
      success: true,
      data: {
        id: node.id,
        nodeName: node.node_name,
        capabilities: JSON.parse(node.capabilities),
        modelVersions: JSON.parse(node.model_versions),
        availableHours: JSON.parse(node.available_hours),
        loadThreshold: node.load_threshold,
        status: node.status,
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors });
    }
    console.error('Create node error:', error);
    res.status(500).json({ success: false, error: 'Failed to create node' });
  }
});

router.get('/', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const nodes = getNodesByUserId(req.userId!) as any[];

    res.json({
      success: true,
      data: nodes.map(node => ({
        id: node.id,
        nodeName: node.node_name,
        capabilities: JSON.parse(node.capabilities),
        modelVersions: JSON.parse(node.model_versions),
        availableHours: JSON.parse(node.available_hours),
        loadThreshold: node.load_threshold,
        status: node.status,
        lastHeartbeat: node.last_heartbeat,
        createdAt: node.created_at,
      }))
    });
  } catch (error) {
    console.error('Get nodes error:', error);
    res.status(500).json({ success: false, error: 'Failed to get nodes' });
  }
});

router.get('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const node = getNodeById(req.params.id) as any;

    if (!node) {
      return res.status(404).json({ success: false, error: 'Node not found' });
    }

    res.json({
      success: true,
      data: {
        id: node.id,
        nodeName: node.node_name,
        capabilities: JSON.parse(node.capabilities),
        modelVersions: JSON.parse(node.model_versions),
        availableHours: JSON.parse(node.available_hours),
        loadThreshold: node.load_threshold,
        status: node.status,
        lastHeartbeat: node.last_heartbeat,
        createdAt: node.created_at,
      }
    });
  } catch (error) {
    console.error('Get node error:', error);
    res.status(500).json({ success: false, error: 'Failed to get node' });
  }
});

router.get('/online/:capability', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { capability } = req.params;

    if (!['llm', 'image_gen'].includes(capability)) {
      return res.status(400).json({ success: false, error: 'Invalid capability' });
    }

    const nodes = getOnlineNodesByCapability(capability) as any[];

    res.json({
      success: true,
      data: nodes.map(node => ({
        id: node.id,
        nodeName: node.node_name,
        capabilities: JSON.parse(node.capabilities),
        loadThreshold: node.load_threshold,
        lastHeartbeat: node.last_heartbeat,
      }))
    });
  } catch (error) {
    console.error('Get online nodes error:', error);
    res.status(500).json({ success: false, error: 'Failed to get online nodes' });
  }
});

export default router;
