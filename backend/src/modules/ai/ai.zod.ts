import { z } from 'zod';
import { QType } from '@prisma/client';

export const generateQuestionsSchema = z.object({
  body: z.object({
    topic: z.string().min(3, 'A topic is required'),
    language: z.string().optional(), // For coding questions

    // Define counts for each type
    mcqCount: z.number().int().min(0).optional().default(0),
    codingCount: z.number().int().min(0).optional().default(0),
    essayCount: z.number().int().min(0).optional().default(0),

    // Define difficulty
    difficulty: z.enum(['EASY', 'MEDIUM', 'HARD', 'ANY']).optional().default('EASY'),
  }),
});