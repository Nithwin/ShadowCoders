import { z } from 'zod';
import { EvaluationKind } from '@prisma/client'; // Import enum

export const createEvaluationSchema = z.object({
  body: z.object({
    kind: z.nativeEnum(EvaluationKind, {
      message: 'Invalid evaluation kind',
    }), // e.g., MANUAL
    score: z
      .number()
      .min(0, 'Score cannot be negative')
      .max(1000, 'Score seems too high'), // Adjust max as needed
    comments: z.string().optional(),
    breakdown: z.record(z.string(), z.any()).optional(),
    isFinal: z.boolean().default(true), // Default to marking this as the final grade
  }),
});