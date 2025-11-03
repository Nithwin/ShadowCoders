import { z } from 'zod';

// This schema validates the BODY of the "Create Section" request
export const createSectionSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Section title must be at least 3 characters'),
    order: z.number().int().min(1, 'Order must be 1 or greater'),
    description: z.string().optional(),
    durationMins: z
      .number()
      .int()
      .positive('Duration must be a positive number')
      .optional(),
  }),
});

export const addQuestionsToSectionSchema = z.object({
  body: z.object({
    questions: z
      .array(
        z.object({
          questionId: z.string().cuid('Invalid question ID format'),
          order: z.number().int().min(1, 'Order must be 1 or greater'),
        })
      )
      .min(1, 'At least one question must be provided'),
  }),
});

export const updateSectionSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Section title must be at least 3 characters').optional(),
    order: z.number().int().min(1, 'Order must be 1 or greater').optional(),
    description: z.string().optional(),
    durationMins: z
      .number()
      .int()
      .positive('Duration must be a positive number')
      .optional(),
  }),
});