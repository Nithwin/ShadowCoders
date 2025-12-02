import z from "zod";
export declare const submitAnswerSchema: z.ZodObject<{
    body: z.ZodObject<{
        questionId: z.ZodString;
        answer: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const listAttemptsSchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
        pageSize: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const resetAttemptsSchema: z.ZodObject<{
    body: z.ZodObject<{
        examId: z.ZodString;
        studentIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
        resetAll: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=attempt.zod.d.ts.map