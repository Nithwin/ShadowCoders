import z from "zod";
export declare const addQuestionsSchema: z.ZodObject<{
    body: z.ZodObject<{
        questions: z.ZodArray<z.ZodIntersection<z.ZodUnion<readonly [z.ZodObject<{
            type: z.ZodLiteral<"MCQ">;
            prompt: z.ZodString;
            options: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                text: z.ZodString;
            }, z.core.$strip>>;
            correctOptionIds: z.ZodArray<z.ZodString>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"CODING">;
            prompt: z.ZodString;
            starterCode: z.ZodOptional<z.ZodString>;
            testcases: z.ZodArray<z.ZodObject<{
                input: z.ZodString;
                expectedOutput: z.ZodString;
                isHidden: z.ZodDefault<z.ZodBoolean>;
                timeoutMs: z.ZodDefault<z.ZodNumber>;
            }, z.core.$strip>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"ESSAY">;
            prompt: z.ZodString;
            wordLimit: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"LISTENING">;
            prompt: z.ZodString;
            options: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                text: z.ZodString;
            }, z.core.$strip>>;
            correctOptionIds: z.ZodArray<z.ZodString>;
            mediaAssetId: z.ZodString;
            maxListenCount: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"SPEAKING">;
            prompt: z.ZodString;
            maxDurationSec: z.ZodOptional<z.ZodNumber>;
            maxReattempts: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"SQL">;
            prompt: z.ZodString;
            config: z.ZodObject<{
                ddl: z.ZodString;
            }, z.core.$strip>;
            testcases: z.ZodArray<z.ZodObject<{
                input: z.ZodString;
                expectedOutput: z.ZodString;
                isHidden: z.ZodDefault<z.ZodBoolean>;
                timeoutMs: z.ZodDefault<z.ZodNumber>;
            }, z.core.$strip>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"FILL">;
            prompt: z.ZodString;
            clozeTemplate: z.ZodOptional<z.ZodString>;
            blanks: z.ZodOptional<z.ZodArray<z.ZodUnknown>>;
            clozeConfig: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"READING">;
            prompt: z.ZodString;
            passageAssetId: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>]>, z.ZodObject<{
            order: z.ZodNumber;
            points: z.ZodNumber;
        }, z.core.$strip>>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const updateQuestionSchema: z.ZodObject<{
    body: z.ZodObject<{
        order: z.ZodOptional<z.ZodNumber>;
        points: z.ZodOptional<z.ZodNumber>;
        prompt: z.ZodOptional<z.ZodString>;
        options: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            text: z.ZodString;
        }, z.core.$strip>>>;
        correctOptionIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
        starterCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        testcases: z.ZodOptional<z.ZodArray<z.ZodObject<{
            input: z.ZodString;
            expectedOutput: z.ZodString;
            isHidden: z.ZodDefault<z.ZodBoolean>;
            timeoutMs: z.ZodDefault<z.ZodNumber>;
        }, z.core.$strip>>>;
        wordLimit: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        mediaAssetId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        passageAssetId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        maxDurationSec: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        config: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=question.zod.d.ts.map