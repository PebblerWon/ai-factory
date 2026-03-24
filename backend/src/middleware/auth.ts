import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { verifyApiKey, updateApiKeyLastUsed, getUserById } from '../sqlite';

const JWT_SECRET = process.env.JWT_SECRET || 'ai-factory-secret-key-change-in-production';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'] as string;

  if (apiKey) {
    const keyHash = hashApiKey(apiKey);
    const apiKeyRecord = verifyApiKey(keyHash) as any;

    if (apiKeyRecord) {
      req.userId = apiKeyRecord.user_id;
      const user = getUserById(apiKeyRecord.user_id) as any;
      req.userRole = user?.role || 'user';
      updateApiKeyLastUsed(apiKeyRecord.id);
      return next();
    }
    return res.status(401).json({ success: false, error: 'Invalid API key' });
  }

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
      req.userId = decoded.userId;
      req.userRole = decoded.role;
      return next();
    } catch (error) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }
  }

  return res.status(401).json({ success: false, error: 'Unauthorized' });
}

export function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  next();
}

export function generateToken(userId: string, role: string): string {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '7d' });
}
