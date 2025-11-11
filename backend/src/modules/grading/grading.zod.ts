import { z } from 'zod';

// Validates the body of the "Run Code" request
export const runCodeSchema = z.object({
  body: z.object({
    questionId: z.string().cuid('Invalid question ID'),
    code: z.string().min(1, 'Code cannot be empty'),
    language: z.string().min(1, 'Language must be specified'), // e.g., "javascript", "python"
    customInput: z.string().optional(), // Optional custom input for testing
    // If customInput is provided, run with custom input; otherwise run against visible test cases
  }),
});