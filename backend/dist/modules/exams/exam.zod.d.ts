import { z } from "zod";
export declare const createExamSchema: z.ZodObject<{
    body: z.ZodObject<{
        title: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        startAt: z.ZodString;
        endAt: z.ZodString;
        durationMins: z.ZodNumber;
        timingMode: z.ZodEnum<{
            OVERALL_ONLY: "OVERALL_ONLY";
            PER_SECTION_ONLY: "PER_SECTION_ONLY";
            BOTH: "BOTH";
        }>;
        sectionLockPolicy: z.ZodEnum<{
            NONE: "NONE";
            LOCK_ON_COMPLETE: "LOCK_ON_COMPLETE";
            LINEAR_NO_BACKTRACK: "LINEAR_NO_BACKTRACK";
        }>;
        randomizeQuestions: z.ZodOptional<z.ZodBoolean>;
        negativeMarkPerWrong: z.ZodOptional<z.ZodNumber>;
        maxAttempts: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        maxTabSwitches: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        allowedLanguages: z.ZodOptional<z.ZodArray<z.ZodString>>;
        releaseResults: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const assignExamSchema: z.ZodObject<{
    body: z.ZodObject<{
        assignToAll: z.ZodOptional<z.ZodBoolean>;
        cohortYear: z.ZodOptional<z.ZodNumber>;
        cohortDepartment: z.ZodOptional<z.ZodString>;
        cohortSection: z.ZodOptional<z.ZodString>;
        studentIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const listExamsSchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
        pageSize: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
        status: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
            DRAFT: "DRAFT";
            PUBLISHED: "PUBLISHED";
            CLOSED: "CLOSED";
            ALL: "ALL";
        }>>>;
        q: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const studentListExamsSchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
        pageSize: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
        filter: z.ZodOptional<z.ZodEnum<{
            COMPLETED: "COMPLETED";
            UPCOMING: "UPCOMING";
            LIVE: "LIVE";
        }>>;
        q: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const updateExamSchema: z.ZodObject<{
    body: z.ZodObject<{
        title: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        startAt: z.ZodOptional<z.ZodString>;
        endAt: z.ZodOptional<z.ZodString>;
        durationMins: z.ZodOptional<z.ZodNumber>;
        timingMode: z.ZodOptional<z.ZodEnum<{
            OVERALL_ONLY: "OVERALL_ONLY";
            PER_SECTION_ONLY: "PER_SECTION_ONLY";
            BOTH: "BOTH";
        }>>;
        sectionLockPolicy: z.ZodOptional<z.ZodEnum<{
            NONE: "NONE";
            LOCK_ON_COMPLETE: "LOCK_ON_COMPLETE";
            LINEAR_NO_BACKTRACK: "LINEAR_NO_BACKTRACK";
        }>>;
        randomizeQuestions: z.ZodOptional<z.ZodBoolean>;
        negativeMarkPerWrong: z.ZodOptional<z.ZodNumber>;
        maxAttempts: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        maxTabSwitches: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        allowedLanguages: z.ZodOptional<z.ZodArray<z.ZodString>>;
        releaseResults: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=exam.zod.d.ts.map