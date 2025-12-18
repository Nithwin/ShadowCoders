import { z } from 'zod';
import { QType } from '@prisma/client';

export const generateQuestionsSchema = z.object({
  body: z
    .object({
      topic: z.string().min(3, 'A topic is required'),
      language: z.string().optional(), // For coding questions

      // Define counts for each type
      mcqCount: z.number().int().min(0).max(20).optional().default(0),
      codingCount: z.number().int().min(0).max(10).optional().default(0),
      sqlCount: z.number().int().min(0).max(10).optional().default(0),
      essayCount: z.number().int().min(0).max(10).optional().default(0),

      // Define difficulty
      difficulty: z.enum(['EASY', 'MEDIUM', 'HARD', 'ANY']).optional().default('ANY'),
      points: z.number().int().positive().optional(),
    })
    .refine(
      (data) => {
        const total = (data.mcqCount || 0) + (data.codingCount || 0) + (data.essayCount || 0) + (data.sqlCount || 0);
        return total > 0;
      },
      {
        message: 'At least one question type must be requested (mcqCount, codingCount, essayCount, sqlCount, etc. must be greater than 0)',
        path: ['mcqCount'],
      }
    ),
});