import { z } from 'zod';

// Validates the body of the "Run Code" request
export const runCodeSchema = z.object({
  body: z.object({
    questionId: z.string().cuid('Invalid question ID'),
    code: z.string().min(1, 'Code cannot be empty'),
    language: z.string().min(1, 'Language must be specified'), // e.g., "javascript", "python"
    customInput: z.string().optional(), // Optional custom input for testing
    runAllTests: z.boolean().optional(), // If true, run all test cases including hidden ones
    // If customInput is provided, run with custom input; otherwise run against visible test cases (or all if runAllTests is true)
  }),
});