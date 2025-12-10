import { Request, Response, NextFunction } from 'express';
import * as activityService from './activity.service';

export const getUserActivityHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.sub;
    if (!userId) {
      return next({ status: 401, message: 'Unauthorized' });
    }

    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const activityData = await activityService.getUserActivityData(userId, year);
    
    res.json(activityData);
  } catch (error) {
    next(error);
  }
};

export const getUserStatsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.sub;
    if (!userId) {
      return next({ status: 401, message: 'Unauthorized' });
    }

    const stats = await activityService.getUserStats(userId);
    res.json(stats);
  } catch (error) {
    next(error);
  }
};

