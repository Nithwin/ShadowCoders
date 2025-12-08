import { z } from 'zod';
export declare const runCodeSchema: z.ZodObject<{
    body: z.ZodObject<{
        questionId: z.ZodString;
        code: z.ZodString;
        language: z.ZodString;
        customInput: z.ZodOptional<z.ZodString>;
        runAllTests: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const autoGradeEssaySchema: z.ZodObject<{
    body: z.ZodObject<{
        responseId: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=grading.zod.d.ts.map