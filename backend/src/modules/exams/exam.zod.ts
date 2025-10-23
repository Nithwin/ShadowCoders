import { z } from 'zod';
import { TimingMode, SectionLockPolicy } from '@prisma/client';

export const createExamSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    description: z.string().optional(),
    
    startAt: z.string().datetime({ message: 'Invalid start date-time format' }),
    endAt: z.string().datetime({ message: 'Invalid end date-time format' }),
    
    durationMins: z
      .number()
      .int()
      .min(1, { message: 'Duration must be a positive integer' }),

    timingMode: z.nativeEnum(TimingMode, {
      message: 'Invalid timing mode',
    }),
    sectionLockPolicy: z.nativeEnum(SectionLockPolicy, {
      message: 'Invalid section lock policy',
    }),

    randomizeQuestions: z.boolean().optional(),
    negativeMarkPerWrong: z.number().optional(),
  }),
});