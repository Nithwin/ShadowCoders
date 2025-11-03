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