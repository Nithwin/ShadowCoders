import { Request, Response } from 'express';
import * as pointsService from './points.service';
import { validate } from '../../middleware/validate';
import { getPointsHistorySchema, adjustPointsSchema, addPointsByEmailSchema } from './points.zod';
import { prisma } from '../../lib/prisma';

export const getMyPoints = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.sub;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const points = await pointsService.getUserPoints(userId);
    res.json({ points });
  } catch (error: any) {
    console.error('Error getting points:', error);
    res.status(error.status || 500).json({ message: error.message || 'Failed to fetch points' });
  }
};

export const getMyPointsHistory = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.sub;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const { page = 1, limit = 20, type } = req.query;
    const result = await pointsService.getPointsHistory(
      userId,
      page as number,
      limit as number,
      type as string
    );
    
    res.json(result);
  } catch (error: any) {
    console.error('Error getting points history:', error);
    res.status(error.status || 500).json({ message: error.message || 'Failed to fetch points history' });
  }
};

export const adjustPoints = async (req: Request, res: Response) => {
  try {
    const { userId, points, description } = req.validatedData?.body || req.body;
    const newBalance = await pointsService.addPoints(userId, points, description);
    res.json({ 
      message: 'Points adjusted successfully',
      newBalance,
    });
  } catch (error: any) {
    console.error('Error adjusting points:', error);
    res.status(error.status || 500).json({ message: error.message || 'Failed to adjust points' });
  }
};

export const addPointsByEmail = async (req: Request, res: Response) => {
  try {
    const { email, points, description } = req.validatedData?.body || req.body;
    
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, points: true },
    });

    if (!user) {
      return res.status(404).json({ message: `User with email ${email} not found` });
    }

    const newBalance = await pointsService.addPoints(
      user.id, 
      points, 
      description || `Points added via API for testing`
    );

    res.json({ 
      message: 'Points added successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      pointsAdded: points,
      previousBalance: user.points || 0,
      newBalance,
    });
  } catch (error: any) {
    console.error('Error adding points by email:', error);
    res.status(error.status || 500).json({ message: error.message || 'Failed to add points' });
  }
};

