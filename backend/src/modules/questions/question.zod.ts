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

const listeningSchema = z.object({
  type: z.literal(QType.LISTENING),
  prompt: z.string().min(1, 'Listening prompt cannot be empty'),
  options: z
    .array(
      z.object({
        id: z.string().min(1),
        text: z.string().min(1),
      })
    )
    .min(2, 'Listening must have at least 2 options')
    .max(8, 'Listening can have at most 8 options'),
  correctOptionIds: z
    .array(z.string().min(1))
    .min(1, 'Listening must have at least 1 correct option'),
  mediaAssetId: z.string().cuid('Media asset ID must be a valid CUID'),
  maxListenCount: z.number().int().positive().optional(),
});

const speakingSchema = z.object({
  type: z.literal(QType.SPEAKING),
  prompt: z.string().min(1, 'Speaking prompt cannot be empty'),
  maxDurationSec: z.number().int().positive().optional(),
  maxReattempts: z.number().int().nonnegative().optional(),
});


export const addQuestionsSchema = z.object({
  body: z.object({
    questions: z
      .array(
        z.discriminatedUnion('type', [
          mcqSchema,
          codingSchema,
          essaySchema,
          listeningSchema,
          speakingSchema,
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

const mcqUpdateSchema = z.object({
  type: z.literal(QType.MCQ).optional(), // Type change isn't really supported, but good for structure
  prompt: z.string().min(1).optional(),
  options: z.array(z.object({ id: z.string(), text: z.string() })).min(2).optional(),
  correctOptionIds: z.array(z.string()).min(1).optional(),
});

const codingUpdateSchema = z.object({
  type: z.literal(QType.CODING).optional(),
  prompt: z.string().min(1).optional(),
  starterCode: z.string().optional(),
  testcases: z.array(z.object({
    input: z.string(),
    expectedOutput: z.string(),
    isHidden: z.boolean().default(false),
    timeoutMs: z.number().int().positive().default(2000),
  })).min(1).optional(),
});

const essayUpdateSchema = z.object({
  type: z.literal(QType.ESSAY).optional(),
  prompt: z.string().min(1).optional(),
  wordLimit: z.number().int().positive().optional(),
});

// --- existing addQuestionsSchema ---

// --- Add schema for updating a single question ---
export const updateQuestionSchema = z.object({
  body: z.object({
    // Common fields
    order: z.number().int().min(1).optional(),
    points: z.number().positive().optional(),
    
    // Type-specific fields
    // We can't use discriminatedUnion because we don't know the type beforehand.
    // Instead, we'll just validate all possible optional fields.
    // The service layer will need to ensure only relevant fields are updated.
    prompt: z.string().min(1).optional(),
    options: z.array(z.object({ id: z.string(), text: z.string() })).min(2).optional(),
    correctOptionIds: z.array(z.string()).min(1).optional(),
    starterCode: z.string().nullable().optional(),
    // Properly validate testcases structure
    testcases: z.array(
      z.object({
        input: z.string(),
        expectedOutput: z.string(),
        isHidden: z.boolean().default(false),
        timeoutMs: z.number().int().positive().default(2000),
      })
    ).optional(),
    wordLimit: z.number().int().positive().nullable().optional(),
    // Add other fields (mediaAssetId, passageAssetId, etc.) as optional
    mediaAssetId: z.string().cuid().nullable().optional(),
    passageAssetId: z.string().cuid().nullable().optional(),
    maxDurationSec: z.number().int().positive().nullable().optional(),
    // Config field for LISTENING (maxListenCount) and SPEAKING (maxReattempts)
    config: z.record(z.string(), z.unknown()).nullable().optional(),
  }),
});