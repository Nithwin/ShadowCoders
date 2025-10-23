import { QType } from "@prisma/client";
import z from "zod";

const mcqSchema = z.object({
  type: z.literal(QType.MCQ),
  prompt: z.string().min(1, "MCQ prompt cannot be empty"),
  options: z
    .array(
      z.object({
        id: z.string().min(1),
        text: z.string().min(1),
      })
    )
    .min(2, "MCQ must have at least 2 options")
    .max(8, "MCQ can have at most 8 options"),
  correctOptionIds: z
    .array(z.string().min(1))
    .min(1, "MCQ must have at least 1 correct option"),
});


const codingSchema = z.object({
  type: z.literal(QType.CODING),
  prompt: z.string().min(1, 'Coding prompt cannot be empty'),
  starterCode: z.string().optional(),
  testcases: z
    .array(
      z.object({
        input: z.string(),
        expectedOutput: z.string(),
        isHidden: z.boolean().default(false),
        timeoutMs: z.number().int().positive().default(2000),
      })
    )
    .min(1, 'Coding question must have at least 1 testcase'),
});

const essaySchema = z.object({
  type: z.literal(QType.ESSAY),
  prompt: z.string().min(1, 'Essay prompt cannot be empty'),
  wordLimit: z.number().int().positive().optional(),
});


export const addQuestionsSchema = z.object({
  body: z.object({
    questions: z
      .array(
        z.discriminatedUnion('type', [
          mcqSchema,
          codingSchema,
          essaySchema,
        ])
        .and(
          z.object({
            order: z.number().int().min(1, 'Question order must be 1 or greater'),
            points: z.number().positive('Points must be a positive number'),
          })
        )
      )
      .min(1, 'At least one question must be provided'),
  }),
});