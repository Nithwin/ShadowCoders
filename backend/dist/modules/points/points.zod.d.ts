import { z } from 'zod';
export declare const getPointsHistorySchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodPipe<z.ZodOptional<z.ZodString>, z.ZodTransform<number, string | undefined>>;
        limit: z.ZodPipe<z.ZodOptional<z.ZodString>, z.ZodTransform<number, string | undefined>>;
        type: z.ZodOptional<z.ZodEnum<{
            ALL: "ALL";
            EARNED: "EARNED";
            SPENT: "SPENT";
            REFUND: "REFUND";
            ADJUSTMENT: "ADJUSTMENT";
        }>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const adjustPointsSchema: z.ZodObject<{
    body: z.ZodObject<{
        userId: z.ZodString;
        points: z.ZodNumber;
        description: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const addPointsByEmailSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodString;
        points: z.ZodNumber;
        description: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type GetPointsHistoryInput = z.infer<typeof getPointsHistorySchema>;
export type AdjustPointsInput = z.infer<typeof adjustPointsSchema>;
export type AddPointsByEmailInput = z.infer<typeof addPointsByEmailSchema>;
//# sourceMappingURL=points.zod.d.ts.map