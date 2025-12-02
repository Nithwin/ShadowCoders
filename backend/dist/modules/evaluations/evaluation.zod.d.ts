import { z } from 'zod';
export declare const createEvaluationSchema: z.ZodObject<{
    body: z.ZodObject<{
        kind: z.ZodEnum<{
            MANUAL: "MANUAL";
            AI: "AI";
        }>;
        score: z.ZodNumber;
        comments: z.ZodOptional<z.ZodString>;
        breakdown: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        isFinal: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=evaluation.zod.d.ts.map