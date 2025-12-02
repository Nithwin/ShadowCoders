"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEvaluationSchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client"); // Import enum
exports.createEvaluationSchema = zod_1.z.object({
    body: zod_1.z.object({
        kind: zod_1.z.nativeEnum(client_1.EvaluationKind, {
            message: 'Invalid evaluation kind',
        }), // e.g., MANUAL
        score: zod_1.z
            .number()
            .min(0, 'Score cannot be negative')
            .max(1000, 'Score seems too high'), // Adjust max as needed
        comments: zod_1.z.string().optional(),
        breakdown: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
        isFinal: zod_1.z.boolean().default(true), // Default to marking this as the final grade
    }),
});
//# sourceMappingURL=evaluation.zod.js.map