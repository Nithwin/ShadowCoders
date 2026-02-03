import { PrismaClient, ProctoringEventType, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export class ProctoringRepo {
  /**
   * Record a proctoring event for an attempt
   */
  async recordEvent(data: {
    attemptId: string;
    eventType: ProctoringEventType;
    severity: string;
    description?: string | null;
    metadata?: Record<string, any> | null;
  }) {
    const event = await prisma.proctoringEvent.create({
      data: {
        attemptId: data.attemptId,
        eventType: data.eventType,
        severity: data.severity,
        description: data.description ?? null,
        metadata: (data.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      },
    });

    // Update violation count on attempt based on event type
    if (data.eventType.includes('EYE') || data.eventType === 'EYES_CLOSED' || data.eventType === 'LOOKING_AWAY') {
      await prisma.attempt.update({
        where: { id: data.attemptId },
        data: {
          eyeTrackingViolations: {
            increment: 1,
          },
        },
      });
    }

    if (data.eventType.includes('HEAD') || data.eventType === 'HEAD_TURNED_AWAY') {
      await prisma.attempt.update({
        where: { id: data.attemptId },
        data: {
          headTrackingViolations: {
            increment: 1,
          },
        },
      });
    }

    return event;
  }

  /**
   * Get all proctoring events for an attempt
   */
  async getEventsByAttemptId(attemptId: string) {
    return prisma.proctoringEvent.findMany({
      where: { attemptId },
      orderBy: { timestamp: 'asc' },
    });
  }

  /**
   * Get proctoring statistics for an attempt
   */
  async getStatsByAttemptId(attemptId: string) {
    const [attempt, events, eventCounts] = await Promise.all([
      prisma.attempt.findUnique({
        where: { id: attemptId },
        select: {
          eyeTrackingViolations: true,
          headTrackingViolations: true,
        },
      }),
      prisma.proctoringEvent.findMany({
        where: { attemptId },
        orderBy: { timestamp: 'asc' },
      }),
      prisma.proctoringEvent.groupBy({
        by: ['eventType'],
        where: { attemptId },
        _count: {
          eventType: true,
        },
      }),
    ]);

    if (!attempt) {
      throw { status: 404, message: 'Attempt not found' };
    }

    const eventCountsMap: Record<string, number> = {};
    eventCounts.forEach(ec => {
      eventCountsMap[ec.eventType] = ec._count.eventType;
    });

    return {
      totalEyeViolations: attempt.eyeTrackingViolations,
      totalHeadViolations: attempt.headTrackingViolations,
      totalViolations: attempt.eyeTrackingViolations + attempt.headTrackingViolations,
      eventCounts: eventCountsMap,
      events,
    };
  }

  /**
   * Get recent events (last N events)
   */
  async getRecentEvents(attemptId: string, limit: number = 10) {
    return prisma.proctoringEvent.findMany({
      where: { attemptId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  /**
   * Delete all proctoring events for an attempt (cleanup)
   */
  async deleteEventsByAttemptId(attemptId: string) {
    return prisma.proctoringEvent.deleteMany({
      where: { attemptId },
    });
  }
}

export const proctoringRepo = new ProctoringRepo();
