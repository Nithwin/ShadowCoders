"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resumeAttemptsSchema = exports.forceSubmitAttemptSchema = exports.submitAttemptSchema = exports.resetAttemptsSchema = exports.listAttemptsSchema = exports.runCodeSchema = exports.submitAnswerSchema = void 0;
const zod_1 = __importDefault(require("zod"));
const answerPayloadSchema = zod_1.default.record(zod_1.default.string(), zod_1.default.any()).nullable();
exports.submitAnswerSchema = zod_1.default.object({
    body: zod_1.default.object({
        questionId: zod_1.default.string().cuid({ message: 'Invalid question ID format' }),
        answer: answerPayloadSchema,
    })
});
exports.runCodeSchema = zod_1.default.object({
    body: zod_1.default.object({
        questionId: zod_1.default.string().cuid({ message: 'Invalid question ID format' }),
        code: zod_1.default.string(),
        language: zod_1.default.string(),
        customInput: zod_1.default.string().optional(),
        runAllTests: zod_1.default.boolean().optional(),
    })
});
exports.listAttemptsSchema = zod_1.default.object({
    query: zod_1.default.object({
        page: zod_1.default.coerce
            .number()
            .int()
            .min(1, 'Page number must be 1 or greater')
            .optional()
            .default(1),
        pageSize: zod_1.default.coerce
            .number()
            .int()
            .min(1, 'Page size must be at least 1')
            .max(100, 'Page size cannot exceed 100')
            .optional()
            .default(20), // Default to 20 per page
        q: zod_1.default.string().optional(), // Search query for student name or email
    }),
});
exports.resetAttemptsSchema = zod_1.default.object({
    body: zod_1.default.object({
        examId: zod_1.default.string().cuid({ message: 'Invalid exam ID format' }),
        studentIds: zod_1.default.array(zod_1.default.string().cuid({ message: 'Invalid student ID format' })).optional(),
        resetAll: zod_1.default.boolean().optional().default(false),
    }),
});
exports.submitAttemptSchema = zod_1.default.object({
    body: zod_1.default.object({
        submissionReason: zod_1.default.string().optional(),
    }),
});
exports.forceSubmitAttemptSchema = zod_1.default.object({
    body: zod_1.default.object({
        submissionReason: zod_1.default.string().optional().default('Force submitted by admin'),
    }),
});
exports.resumeAttemptsSchema = zod_1.default.object({
    body: zod_1.default.object({
        examId: zod_1.default.string().cuid({ message: 'Invalid exam ID format' }),
        studentIds: zod_1.default.array(zod_1.default.string().cuid({ message: 'Invalid student ID format' })).optional(),
        resumeAll: zod_1.default.boolean().optional().default(false),
    }),
});
//# sourceMappingURL=attempt.zod.js.map