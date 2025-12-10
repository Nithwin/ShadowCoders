import { z } from 'zod';

export const createRedeemItemSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    pointsCost: z.number().int().positive(),
    itemType: z.string(),
    metadata: z.record(z.string(), z.any()).optional(),
  }),
});

export const updateRedeemItemSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    pointsCost: z.number().int().positive().optional(),
    isActive: z.boolean().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  }),
});

export const createRedeemOrderSchema = z.object({
  body: z.object({
    itemId: z.string(),
    leaveDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
    message: z.string().optional(),
  }),
});

export const updateRedeemOrderSchema = z.object({
  body: z.object({
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED']),
    adminNotes: z.string().optional(),
    rejectionReason: z.string().optional(),
    reportUrl: z.string().optional(),
  }),
});

export const listRedeemOrdersSchema = z.object({
  query: z.object({
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED']).optional(),
    page: z.string().optional().transform(val => val ? parseInt(val) : 1),
    limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
  }),
});

export type CreateRedeemItemInput = z.infer<typeof createRedeemItemSchema>;
export type UpdateRedeemItemInput = z.infer<typeof updateRedeemItemSchema>;
export type CreateRedeemOrderInput = z.infer<typeof createRedeemOrderSchema>;
export type UpdateRedeemOrderInput = z.infer<typeof updateRedeemOrderSchema>;
export type ListRedeemOrdersInput = z.infer<typeof listRedeemOrdersSchema>;

