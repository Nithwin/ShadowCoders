"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSectionSchema = exports.addQuestionsToSectionSchema = exports.createSectionSchema = void 0;
const zod_1 = require("zod");
// This schema validates the BODY of the "Create Section" request
exports.createSectionSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(3, 'Section title must be at least 3 characters'),
        order: zod_1.z.number().int().min(1, 'Order must be 1 or greater'),
        description: zod_1.z.string().optional(),
        durationMins: zod_1.z
            .number()
            .int()
            .positive('Duration must be a positive number')
            .optional(),
    }),
});
exports.addQuestionsToSectionSchema = zod_1.z.object({
    body: zod_1.z.object({
        questions: zod_1.z
            .array(zod_1.z.object({
            questionId: zod_1.z.string().cuid('Invalid question ID format'),
            order: zod_1.z.number().int().min(1, 'Order must be 1 or greater'),
        }))
            .min(1, 'At least one question must be provided'),
    }),
});
exports.updateSectionSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(3, 'Section title must be at least 3 characters').optional(),
        order: zod_1.z.number().int().min(1, 'Order must be 1 or greater').optional(),
        description: zod_1.z.string().optional(),
        durationMins: zod_1.z
            .number()
            .int()
            .positive('Duration must be a positive number')
            .optional(),
    }),
});
//# sourceMappingURL=section.zod.js.map