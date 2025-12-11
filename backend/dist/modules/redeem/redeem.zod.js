"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listRedeemOrdersSchema = exports.updateRedeemOrderSchema = exports.createRedeemOrderSchema = exports.updateRedeemItemSchema = exports.createRedeemItemSchema = void 0;
const zod_1 = require("zod");
exports.createRedeemItemSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1),
        description: zod_1.z.string().optional(),
        pointsCost: zod_1.z.number().int().positive(),
        itemType: zod_1.z.string(),
        metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    }),
});
exports.updateRedeemItemSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1).optional(),
        description: zod_1.z.string().optional(),
        pointsCost: zod_1.z.number().int().positive().optional(),
        isActive: zod_1.z.boolean().optional(),
        metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    }),
});
exports.createRedeemOrderSchema = zod_1.z.object({
    body: zod_1.z.object({
        itemId: zod_1.z.string(),
        leaveDate: zod_1.z.string().optional().transform((val) => val ? new Date(val) : undefined),
        message: zod_1.z.string().optional(),
    }),
});
exports.updateRedeemOrderSchema = zod_1.z.object({
    body: zod_1.z.object({
        status: zod_1.z.enum(['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED']),
        adminNotes: zod_1.z.string().optional(),
        rejectionReason: zod_1.z.string().optional(),
        reportUrl: zod_1.z.string().optional(),
    }),
});
exports.listRedeemOrdersSchema = zod_1.z.object({
    query: zod_1.z.object({
        status: zod_1.z.enum(['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED']).optional(),
        page: zod_1.z.string().optional().transform(val => val ? parseInt(val) : 1),
        limit: zod_1.z.string().optional().transform(val => val ? parseInt(val) : 20),
    }),
});
//# sourceMappingURL=redeem.zod.js.map