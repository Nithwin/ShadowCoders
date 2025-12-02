import { z } from 'zod';
export declare const createSectionSchema: z.ZodObject<{
    body: z.ZodObject<{
        title: z.ZodString;
        order: z.ZodNumber;
        description: z.ZodOptional<z.ZodString>;
        durationMins: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const addQuestionsToSectionSchema: z.ZodObject<{
    body: z.ZodObject<{
        questions: z.ZodArray<z.ZodObject<{
            questionId: z.ZodString;
            order: z.ZodNumber;
        }, z.core.$strip>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const updateSectionSchema: z.ZodObject<{
    body: z.ZodObject<{
        title: z.ZodOptional<z.ZodString>;
        order: z.ZodOptional<z.ZodNumber>;
        description: z.ZodOptional<z.ZodString>;
        durationMins: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=section.zod.d.ts.map