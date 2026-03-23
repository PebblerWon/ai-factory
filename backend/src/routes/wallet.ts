import { Router, Response } from 'express';
import { getUserById, getTransactionsByUserId } from '../sqlite';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/balance', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const user = getUserById(req.userId!) as any;

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        points: user.points
      }
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({ success: false, error: 'Failed to get balance' });
  }
});

router.get('/transactions', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const transactions = getTransactionsByUserId(req.userId!) as any[];

    res.json({
      success: true,
      data: transactions.map(tx => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        taskId: tx.task_id,
        description: tx.description,
        createdAt: tx.created_at,
      }))
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ success: false, error: 'Failed to get transactions' });
  }
});

export default router;
