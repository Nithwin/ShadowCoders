import { z } from 'zod';

export const recordProctoringEventSchema = z.object({
  attemptId: z.string().cuid(),
  eventType: z.enum([
    'EYE_TRACKING_VIOLATION',
    'HEAD_TRACKING_VIOLATION',
    'FACE_NOT_DETECTED',
    'MULTIPLE_FACES_DETECTED',
    'LOOKING_AWAY',
    'HEAD_TURNED_AWAY',
    'EYES_CLOSED',
    'SUSPICIOUS_MOVEMENT'
  ]),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const getProctoringEventsSchema = z.object({
  attemptId: z.string().cuid(),
});

export const getProctoringStatsSchema = z.object({
  attemptId: z.string().cuid(),
});

export type RecordProctoringEventInput = z.infer<typeof recordProctoringEventSchema>;
export type GetProctoringEventsInput = z.infer<typeof getProctoringEventsSchema>;
export type GetProctoringStatsInput = z.infer<typeof getProctoringStatsSchema>;
