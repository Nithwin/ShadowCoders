import { proctoringRepo } from './proctoring.repo';
import { ProctoringEventType } from '@prisma/client';
import { logger } from '../../lib/logger';

export class ProctoringService {
  /**
   * Record a proctoring event
   */
  async recordEvent(data: {
    attemptId: string;
    eventType: ProctoringEventType;
    severity: string;
    description?: string | undefined;
    metadata?: Record<string, any> | undefined;
  }) {
    try {
      const event = await proctoringRepo.recordEvent({
        attemptId: data.attemptId,
        eventType: data.eventType,
        severity: data.severity,
        description: data.description || null,
        metadata: data.metadata || null,
      });

      logger.info(`Proctoring event recorded: ${data.eventType} for attempt ${data.attemptId}`);

      return event;
    } catch (error: any) {
      logger.error('Failed to record proctoring event:', error);
      throw { status: 500, message: 'Failed to record proctoring event' };
    }
  }

  /**
   * Get all proctoring events for an attempt
   */
  async getEvents(attemptId: string) {
    try {
      const events = await proctoringRepo.getEventsByAttemptId(attemptId);
      return events;
    } catch (error: any) {
      logger.error('Failed to get proctoring events:', error);
      throw { status: 500, message: 'Failed to retrieve proctoring events' };
    }
  }

  /**
   * Get proctoring statistics and summary for an attempt
   */
  async getStats(attemptId: string) {
    try {
      const stats = await proctoringRepo.getStatsByAttemptId(attemptId);
      return stats;
    } catch (error: any) {
      if (error.status === 404) {
        throw error;
      }
      logger.error('Failed to get proctoring stats:', error);
      throw { status: 500, message: 'Failed to retrieve proctoring statistics' };
    }
  }

  /**
   * Get recent proctoring events
   */
  async getRecentEvents(attemptId: string, limit: number = 10) {
    try {
      const events = await proctoringRepo.getRecentEvents(attemptId, limit);
      return events;
    } catch (error: any) {
      logger.error('Failed to get recent proctoring events:', error);
      throw { status: 500, message: 'Failed to retrieve recent events' };
    }
  }
}

export const proctoringService = new ProctoringService();
