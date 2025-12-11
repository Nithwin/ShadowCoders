import { z } from 'zod';
export declare const generateQuestionsSchema: z.ZodObject<{
    body: z.ZodObject<{
        topic: z.ZodString;
        language: z.ZodOptional<z.ZodString>;
        mcqCount: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        codingCount: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        essayCount: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        difficulty: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
            EASY: "EASY";
            MEDIUM: "MEDIUM";
            HARD: "HARD";
            ANY: "ANY";
        }>>>;
        points: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=ai.zod.d.ts.map