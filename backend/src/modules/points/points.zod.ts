import { z } from 'zod';

export const getPointsHistorySchema = z.object({
  query: z.object({
    page: z.string().optional().transform(val => val ? parseInt(val) : 1),
    limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
    type: z.enum(['EARNED', 'SPENT', 'REFUND', 'ADJUSTMENT', 'ALL']).optional(),
  }),
});

export const adjustPointsSchema = z.object({
  body: z.object({
    userId: z.string(),
    points: z.number().int(),
    description: z.string().optional(),
  }),
});

export const addPointsByEmailSchema = z.object({
  body: z.object({
    email: z.string().email('Valid email is required'),
    points: z.number().int('Points must be an integer'),
    description: z.string().optional(),
  }),
});

export type GetPointsHistoryInput = z.infer<typeof getPointsHistorySchema>;
export type AdjustPointsInput = z.infer<typeof adjustPointsSchema>;
export type AddPointsByEmailInput = z.infer<typeof addPointsByEmailSchema>;

