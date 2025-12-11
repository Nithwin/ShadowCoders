"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addPointsByEmailSchema = exports.adjustPointsSchema = exports.getPointsHistorySchema = void 0;
const zod_1 = require("zod");
exports.getPointsHistorySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string().optional().transform(val => val ? parseInt(val) : 1),
        limit: zod_1.z.string().optional().transform(val => val ? parseInt(val) : 20),
        type: zod_1.z.enum(['EARNED', 'SPENT', 'REFUND', 'ADJUSTMENT', 'ALL']).optional(),
    }),
});
exports.adjustPointsSchema = zod_1.z.object({
    body: zod_1.z.object({
        userId: zod_1.z.string(),
        points: zod_1.z.number().int(),
        description: zod_1.z.string().optional(),
    }),
});
exports.addPointsByEmailSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email('Valid email is required'),
        points: zod_1.z.number().int('Points must be an integer'),
        description: zod_1.z.string().optional(),
    }),
});
//# sourceMappingURL=points.zod.js.map