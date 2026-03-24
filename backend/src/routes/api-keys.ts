import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import crypto from 'crypto';
import { createApiKey, getApiKeysByUserId, deleteApiKey } from '../sqlite';
import { authMiddleware, AuthRequest, hashApiKey } from '../middleware/auth';

const router = Router();

const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
});

router.post('/', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { name } = createApiKeySchema.parse(req.body);

    const apiKey = `aif_sk_${crypto.randomBytes(16).toString('hex')}`;
    const keyHash = hashApiKey(apiKey);
    const keyPrefix = apiKey.substring(0, 12) + '...';
    const id = uuidv4();

    createApiKey({
      id,
      userId: req.userId!,
      name,
      keyHash,
      keyPrefix,
    });

    res.json({
      success: true,
      data: {
        id,
        name,
        key: apiKey,
        keyPrefix,
        createdAt: new Date().toISOString(),
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors });
    }
    console.error('Create API key error:', error);
    res.status(500).json({ success: false, error: 'Failed to create API key' });
  }
});

router.get('/', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const apiKeys = getApiKeysByUserId(req.userId!) as any[];

    res.json({
      success: true,
      data: apiKeys.map(key => ({
        id: key.id,
        name: key.name,
        keyPrefix: key.key_prefix,
        createdAt: key.created_at,
        lastUsedAt: key.last_used_at,
      }))
    });
  } catch (error) {
    console.error('Get API keys error:', error);
    res.status(500).json({ success: false, error: 'Failed to get API keys' });
  }
});

router.delete('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = deleteApiKey(id, req.userId!);

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'API key not found' });
    }

    res.json({
      success: true,
      message: 'API key deleted successfully'
    });
  } catch (error) {
    console.error('Delete API key error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete API key' });
  }
});

export default router;
