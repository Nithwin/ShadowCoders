import { z } from 'zod';
export declare const createRedeemItemSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        pointsCost: z.ZodNumber;
        itemType: z.ZodString;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const updateRedeemItemSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        pointsCost: z.ZodOptional<z.ZodNumber>;
        isActive: z.ZodOptional<z.ZodBoolean>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const createRedeemOrderSchema: z.ZodObject<{
    body: z.ZodObject<{
        itemId: z.ZodString;
        leaveDate: z.ZodPipe<z.ZodOptional<z.ZodString>, z.ZodTransform<Date | undefined, string | undefined>>;
        message: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const updateRedeemOrderSchema: z.ZodObject<{
    body: z.ZodObject<{
        status: z.ZodEnum<{
            PENDING: "PENDING";
            APPROVED: "APPROVED";
            REJECTED: "REJECTED";
            COMPLETED: "COMPLETED";
        }>;
        adminNotes: z.ZodOptional<z.ZodString>;
        rejectionReason: z.ZodOptional<z.ZodString>;
        reportUrl: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const listRedeemOrdersSchema: z.ZodObject<{
    query: z.ZodObject<{
        status: z.ZodOptional<z.ZodEnum<{
            PENDING: "PENDING";
            APPROVED: "APPROVED";
            REJECTED: "REJECTED";
            COMPLETED: "COMPLETED";
        }>>;
        page: z.ZodPipe<z.ZodOptional<z.ZodString>, z.ZodTransform<number, string | undefined>>;
        limit: z.ZodPipe<z.ZodOptional<z.ZodString>, z.ZodTransform<number, string | undefined>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type CreateRedeemItemInput = z.infer<typeof createRedeemItemSchema>;
export type UpdateRedeemItemInput = z.infer<typeof updateRedeemItemSchema>;
export type CreateRedeemOrderInput = z.infer<typeof createRedeemOrderSchema>;
export type UpdateRedeemOrderInput = z.infer<typeof updateRedeemOrderSchema>;
export type ListRedeemOrdersInput = z.infer<typeof listRedeemOrdersSchema>;
//# sourceMappingURL=redeem.zod.d.ts.map