"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateQuestionsSchema = void 0;
const zod_1 = require("zod");
exports.generateQuestionsSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        topic: zod_1.z.string().min(3, 'A topic is required'),
        language: zod_1.z.string().optional(), // For coding questions
        // Define counts for each type
        mcqCount: zod_1.z.number().int().min(0).max(20).optional().default(0),
        codingCount: zod_1.z.number().int().min(0).max(10).optional().default(0),
        essayCount: zod_1.z.number().int().min(0).max(10).optional().default(0),
        // Define difficulty
        difficulty: zod_1.z.enum(['EASY', 'MEDIUM', 'HARD', 'ANY']).optional().default('ANY'),
    })
        .refine((data) => {
        const total = (data.mcqCount || 0) + (data.codingCount || 0) + (data.essayCount || 0);
        return total > 0;
    }, {
        message: 'At least one question type must be requested (mcqCount, codingCount, or essayCount must be greater than 0)',
        path: ['mcqCount'],
    }),
});
//# sourceMappingURL=ai.zod.js.map