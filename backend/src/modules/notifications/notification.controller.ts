import { RequestHandler, Request } from 'express';
import * as notificationService from './notification.service';
import { AuthenticatedRequest } from '../../middleware/auth';

export const getNotifications: RequestHandler = async (req, res, next) => {
  try {
    const userId = (req as AuthenticatedRequest).user?.sub;
    if (!userId) return next({ status: 401, message: 'Unauthorized' });

    const notifications = await notificationService.getUserNotifications(userId as string);
    res.json(notifications);
  } catch (error) {
    next(error);
  }
};

export const markAsRead: RequestHandler = async (req, res, next) => {
  try {
    const userId = (req as AuthenticatedRequest).user?.sub;
    const { id } = req.params;
    if (!userId) return next({ status: 401, message: 'Unauthorized' });

    if (!id) return next({ status: 400, message: 'Notification ID required' });
    await notificationService.markAsRead(id, userId as string);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead: RequestHandler = async (req, res, next) => {
  try {
    const userId = (req as AuthenticatedRequest).user?.sub;
    if (!userId) return next({ status: 401, message: 'Unauthorized' });

    await notificationService.markAllAsRead(userId as string);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};
