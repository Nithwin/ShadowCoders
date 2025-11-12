import z from "zod";


const answerPayloadSchema = z.record(z.string(), z.any()).nullable();

export const submitAnswerSchema = z.object({
    body: z.object({
        questionId: z.string().cuid({message: 'Invalid question ID format'}),
        answer: answerPayloadSchema,
    })
})

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
      .max(100, 'Page size cannot exceed 100')
      .optional()
      .default(20), // Default to 20 per page
  }),
});

export const resetAttemptsSchema = z.object({
  body: z.object({
    examId: z.string().cuid({ message: 'Invalid exam ID format' }),
    studentIds: z.array(z.string().cuid({ message: 'Invalid student ID format' })).optional(),
    resetAll: z.boolean().optional().default(false),
  }),
});