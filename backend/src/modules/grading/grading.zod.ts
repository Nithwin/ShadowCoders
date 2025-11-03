import { z } from 'zod';

// Validates the body of the "Run Code" request
export const runCodeSchema = z.object({
  body: z.object({
    questionId: z.string().cuid('Invalid question ID'),
    code: z.string().min(1, 'Code cannot be empty'),
    language: z.string().min(1, 'Language must be specified'), // e.g., "javascript", "python"
    // We'll get the testcases from the database, not the client.
  }),
});