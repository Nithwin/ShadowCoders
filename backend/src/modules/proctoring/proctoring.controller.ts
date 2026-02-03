import { Request, Response, NextFunction } from 'express';
import { proctoringService } from './proctoring.service';
import {
  recordProctoringEventSchema,
  getProctoringEventsSchema,
  getProctoringStatsSchema,
} from './proctoring.zod';
import { logger } from '../../lib/logger';

export class ProctoringController {
  /**
   * POST /api/proctoring/events
   * Record a proctoring event
   */
  async recordEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const data = recordProctoringEventSchema.parse(req.body);

      const event = await proctoringService.recordEvent({
        attemptId: data.attemptId,
        eventType: data.eventType,
        severity: data.severity,
        description: data.description,
        metadata: data.metadata,
      });

      res.json({
        success: true,
        data: event,
      });
    } catch (error: any) {
      logger.error('Error in recordEvent controller:', error);
      next(error);
    }
  }

  /**
   * GET /api/proctoring/events/:attemptId
   * Get all proctoring events for an attempt
   */
  async getEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const { attemptId } = getProctoringEventsSchema.parse({
        attemptId: req.params.attemptId,
      });

      const events = await proctoringService.getEvents(attemptId);

      res.json({
        success: true,
        data: events,
      });
    } catch (error: any) {
      logger.error('Error in getEvents controller:', error);
      next(error);
    }
  }

  /**
   * GET /api/proctoring/stats/:attemptId
   * Get proctoring statistics for an attempt
   */
  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { attemptId } = getProctoringStatsSchema.parse({
        attemptId: req.params.attemptId,
      });

      const stats = await proctoringService.getStats(attemptId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      logger.error('Error in getStats controller:', error);
      next(error);
    }
  }

  /**
   * GET /api/proctoring/recent/:attemptId
   * Get recent proctoring events for an attempt
   */
  async getRecentEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const { attemptId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const events = await proctoringService.getRecentEvents(attemptId || '', limit);

      res.json({
        success: true,
        data: events,
      });
    } catch (error: any) {
      logger.error('Error in getRecentEvents controller:', error);
      next(error);
    }
  }
}

export const proctoringController = new ProctoringController();
