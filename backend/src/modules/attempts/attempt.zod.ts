import z from "zod";


const answerPayloadSchema = z.record(z.string(), z.any()).nullable();

export const submitAnswerSchema = z.object({
  body: z.object({
    questionId: z.string().cuid({ message: 'Invalid question ID format' }),
    answer: answerPayloadSchema,
  })
})

export const runCodeSchema = z.object({
  body: z.object({
    questionId: z.string().cuid({ message: 'Invalid question ID format' }),
    code: z.string(),
    language: z.string(),
    customInput: z.string().optional(),
    runAllTests: z.boolean().optional(),
  })
});

export const listAttemptsSchema = z.object({
  query: z.object({
    page: z.coerce
      .number()
      .int()
      .min(1, 'Page number must be 1 or greater')
      .optional()
      .default(1),
    pageSize: z.coerce
      .number()
      .int()
      .min(1, 'Page size must be at least 1')
      .max(1000, 'Page size cannot exceed 1000')
      .optional()
      .default(20), // Default to 20 per page
    q: z.string().optional(), // Search query for student name or email
  }),
});

export const resetAttemptsSchema = z.object({
  body: z.object({
    examId: z.string().cuid({ message: 'Invalid exam ID format' }),
    studentIds: z.array(z.string().cuid({ message: 'Invalid student ID format' })).optional(),
    resetAll: z.boolean().optional().default(false),
  }),
});

export const submitAttemptSchema = z.object({
  body: z.object({
    submissionReason: z.string().optional(),
  }),
});

export const forceSubmitAttemptSchema = z.object({
  body: z.object({
    submissionReason: z.string().optional().default('Force submitted by admin'),
  }),
});

export const resumeAttemptsSchema = z.object({
  body: z.object({
    examId: z.string().cuid({ message: 'Invalid exam ID format' }),
    studentIds: z.array(z.string().cuid({ message: 'Invalid student ID format' })).optional(),
    resumeAll: z.boolean().optional().default(false),
  }),
});