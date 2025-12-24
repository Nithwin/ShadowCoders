"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateQuestionSchema = exports.addQuestionsSchema = void 0;
const client_1 = require("@prisma/client");
const zod_1 = __importDefault(require("zod"));
const mcqSchema = zod_1.default.object({
    type: zod_1.default.literal(client_1.QType.MCQ),
    prompt: zod_1.default.string().min(1, "MCQ prompt cannot be empty"),
    options: zod_1.default
        .array(zod_1.default.object({
        id: zod_1.default.string().min(1),
        text: zod_1.default.string().min(1),
    }))
        .min(2, "MCQ must have at least 2 options")
        .max(8, "MCQ can have at most 8 options"),
    correctOptionIds: zod_1.default
        .array(zod_1.default.string().min(1))
        .min(1, "MCQ must have at least 1 correct option"),
});
const codingSchema = zod_1.default.object({
    type: zod_1.default.literal(client_1.QType.CODING),
    prompt: zod_1.default.string().min(1, 'Coding prompt cannot be empty'),
    starterCode: zod_1.default.string().nullable().optional(), // Allow null or undefined
    language: zod_1.default.string().optional(), // For SQL questions: "sql"
    config: zod_1.default.object({
        ddl: zod_1.default.string().optional(), // For SQL questions: database schema
    }).optional(),
    testcases: zod_1.default
        .array(zod_1.default.object({
        input: zod_1.default.string(),
        expectedOutput: zod_1.default.string(),
        isHidden: zod_1.default.boolean().default(false),
        timeoutMs: zod_1.default.number().int().positive().default(2000),
    }))
        .min(1, 'Coding question must have at least 1 testcase'),
});
const essaySchema = zod_1.default.object({
    type: zod_1.default.literal(client_1.QType.ESSAY),
    prompt: zod_1.default.string().min(1, 'Essay prompt cannot be empty'),
    wordLimit: zod_1.default.number().int().positive().optional(),
});
const listeningSchema = zod_1.default.object({
    type: zod_1.default.literal(client_1.QType.LISTENING),
    prompt: zod_1.default.string().min(1, 'Listening prompt cannot be empty'),
    options: zod_1.default
        .array(zod_1.default.object({
        id: zod_1.default.string().min(1),
        text: zod_1.default.string().min(1),
    }))
        .min(2, 'Listening must have at least 2 options')
        .max(8, 'Listening can have at most 8 options'),
    correctOptionIds: zod_1.default
        .array(zod_1.default.string().min(1))
        .min(1, 'Listening must have at least 1 correct option'),
    mediaAssetId: zod_1.default.string().cuid('Media asset ID must be a valid CUID'),
    maxListenCount: zod_1.default.number().int().positive().optional(),
});
const speakingSchema = zod_1.default.object({
    type: zod_1.default.literal(client_1.QType.SPEAKING),
    prompt: zod_1.default.string().min(1, 'Speaking prompt cannot be empty'),
    maxDurationSec: zod_1.default.number().int().positive().optional(),
    maxReattempts: zod_1.default.number().int().nonnegative().optional(),
});
const sqlSchema = zod_1.default.object({
    type: zod_1.default.literal(client_1.QType.SQL),
    prompt: zod_1.default.string().min(1, 'SQL prompt cannot be empty'),
    config: zod_1.default.object({
        ddl: zod_1.default.string().min(1, "DDL (Schema) is required"),
    }),
    testcases: zod_1.default
        .array(zod_1.default.object({
        input: zod_1.default.string(), // DML (Inserts)
        expectedOutput: zod_1.default.string(),
        isHidden: zod_1.default.boolean().default(false),
        timeoutMs: zod_1.default.number().int().positive().default(5000),
    }))
        .min(1, 'SQL question must have at least 1 testcase'),
});
const fillSchema = zod_1.default.object({
    type: zod_1.default.literal(client_1.QType.FILL),
    prompt: zod_1.default.string().min(1, 'FILL prompt cannot be empty'),
    clozeTemplate: zod_1.default.string().optional(),
    blanks: zod_1.default.array(zod_1.default.unknown()).optional(),
    clozeConfig: zod_1.default.record(zod_1.default.string(), zod_1.default.unknown()).optional(),
});
const readingSchema = zod_1.default.object({
    type: zod_1.default.literal(client_1.QType.READING),
    prompt: zod_1.default.string().min(1, 'READING prompt cannot be empty'),
    passageAssetId: zod_1.default.string().cuid().optional(),
});
exports.addQuestionsSchema = zod_1.default.object({
    body: zod_1.default.object({
        questions: zod_1.default
            .array(zod_1.default.union([
            mcqSchema,
            codingSchema,
            essaySchema,
            listeningSchema,
            speakingSchema,
            sqlSchema,
            fillSchema,
            readingSchema,
        ])
            .and(zod_1.default.object({
            order: zod_1.default.number().int().min(1, 'Question order must be 1 or greater'),
            points: zod_1.default.number().positive('Points must be a positive number'),
        })))
            .min(1, 'At least one question must be provided'),
    }),
});
const mcqUpdateSchema = zod_1.default.object({
    type: zod_1.default.literal(client_1.QType.MCQ).optional(), // Type change isn't really supported, but good for structure
    prompt: zod_1.default.string().min(1).optional(),
    options: zod_1.default.array(zod_1.default.object({ id: zod_1.default.string(), text: zod_1.default.string() })).min(2).optional(),
    correctOptionIds: zod_1.default.array(zod_1.default.string()).min(1).optional(),
});
const codingUpdateSchema = zod_1.default.object({
    type: zod_1.default.literal(client_1.QType.CODING).optional(),
    prompt: zod_1.default.string().min(1).optional(),
    starterCode: zod_1.default.string().optional(),
    language: zod_1.default.string().optional(), // For SQL questions
    config: zod_1.default.object({
        ddl: zod_1.default.string().optional(),
    }).optional(),
    testcases: zod_1.default.array(zod_1.default.object({
        input: zod_1.default.string(),
        expectedOutput: zod_1.default.string(),
        isHidden: zod_1.default.boolean().default(false),
        timeoutMs: zod_1.default.number().int().positive().default(2000),
    })).min(1).optional(),
});
const essayUpdateSchema = zod_1.default.object({
    type: zod_1.default.literal(client_1.QType.ESSAY).optional(),
    prompt: zod_1.default.string().min(1).optional(),
    wordLimit: zod_1.default.number().int().positive().optional(),
});
// --- existing addQuestionsSchema ---
// --- Add schema for updating a single question ---
exports.updateQuestionSchema = zod_1.default.object({
    body: zod_1.default.object({
        // Common fields
        order: zod_1.default.number().int().min(1).optional(),
        points: zod_1.default.number().positive().optional(),
        // Type-specific fields
        // We can't use discriminatedUnion because we don't know the type beforehand.
        // Instead, we'll just validate all possible optional fields.
        // The service layer will need to ensure only relevant fields are updated.
        prompt: zod_1.default.string().min(1).optional(),
        options: zod_1.default.array(zod_1.default.object({ id: zod_1.default.string(), text: zod_1.default.string() })).min(2).optional(),
        correctOptionIds: zod_1.default.array(zod_1.default.string()).min(1).optional(),
        starterCode: zod_1.default.string().nullable().optional(),
        // Properly validate testcases structure
        testcases: zod_1.default.array(zod_1.default.object({
            input: zod_1.default.string(),
            expectedOutput: zod_1.default.string(),
            isHidden: zod_1.default.boolean().default(false),
            timeoutMs: zod_1.default.number().int().positive().default(2000),
        })).optional(),
        wordLimit: zod_1.default.number().int().positive().nullable().optional(),
        // Add other fields (mediaAssetId, passageAssetId, etc.) as optional
        mediaAssetId: zod_1.default.string().cuid().nullable().optional(),
        passageAssetId: zod_1.default.string().cuid().nullable().optional(),
        maxDurationSec: zod_1.default.number().int().positive().nullable().optional(),
        // Config field for LISTENING (maxListenCount) and SPEAKING (maxReattempts)
        config: zod_1.default.record(zod_1.default.string(), zod_1.default.unknown()).nullable().optional(),
    }),
});
//# sourceMappingURL=question.zod.js.map