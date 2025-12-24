import { z } from 'zod';
import { createExamSchema, assignExamSchema, listExamsSchema, studentListExamsSchema, updateExamSchema } from "./exam.zod";
import { Prisma } from "@prisma/client";
type CreateExamInput = z.infer<typeof createExamSchema>["body"];
export declare const createExam: (input: CreateExamInput) => Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    status: import(".prisma/client").$Enums.ExamStatus;
    description: string | null;
    title: string;
    startAt: Date;
    endAt: Date;
    durationMins: number;
    timingMode: import(".prisma/client").$Enums.TimingMode;
    sectionLockPolicy: import(".prisma/client").$Enums.SectionLockPolicy;
    randomizeQuestions: boolean;
    negativeMarkPerWrong: Prisma.Decimal | null;
    maxAttempts: number | null;
    maxTabSwitches: number | null;
    allowedLanguages: Prisma.JsonValue | null;
    releaseResults: boolean;
}>;
type AssignExamInput = z.infer<typeof assignExamSchema>["body"];
export declare const assignExam: (examId: string, input: AssignExamInput) => Promise<{
    id: string;
    examId: string;
    assignToAll: boolean;
    cohortYear: number | null;
    cohortDepartment: string | null;
    cohortSection: string | null;
    studentIds: Prisma.JsonValue | null;
}>;
export declare const deleteAssignment: (examId: string, assignmentId: string) => Promise<{
    message: string;
}>;
export declare const pubishExam: (examId: string) => Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    status: import(".prisma/client").$Enums.ExamStatus;
    description: string | null;
    title: string;
    startAt: Date;
    endAt: Date;
    durationMins: number;
    timingMode: import(".prisma/client").$Enums.TimingMode;
    sectionLockPolicy: import(".prisma/client").$Enums.SectionLockPolicy;
    randomizeQuestions: boolean;
    negativeMarkPerWrong: Prisma.Decimal | null;
    maxAttempts: number | null;
    maxTabSwitches: number | null;
    allowedLanguages: Prisma.JsonValue | null;
    releaseResults: boolean;
}>;
type ListExamQuery = z.infer<typeof listExamsSchema>["query"];
export declare const listExams: (query: ListExamQuery) => Promise<{
    data: {
        negativeMarkPerWrong: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ExamStatus;
        description: string | null;
        title: string;
        _count: {
            sections: number;
            attempts: number;
            questions: number;
        };
        startAt: Date;
        endAt: Date;
        durationMins: number;
        timingMode: import(".prisma/client").$Enums.TimingMode;
        sectionLockPolicy: import(".prisma/client").$Enums.SectionLockPolicy;
        randomizeQuestions: boolean;
    }[];
    meta: {
        page: number;
        pageSize: number;
        totalCount: number;
        totalPages: number;
    };
}>;
type StudentListExamsQuery = z.infer<typeof studentListExamsSchema>['query'];
export declare const listExamsForStudent: (studentId: string, query: StudentListExamsQuery) => Promise<{
    data: {
        hasAttempt: boolean;
        attemptId: string | null;
        attemptStatus: import(".prisma/client").$Enums.AttemptStatus | null;
        attemptCount: number;
        submittedAttemptCount: number;
        latestScore: number | null;
        latestMaxScore: number | null;
        id: string;
        status: import(".prisma/client").$Enums.ExamStatus;
        description: string | null;
        title: string;
        startAt: Date;
        endAt: Date;
        durationMins: number;
        maxAttempts: number | null;
    }[];
    meta: {
        page: number;
        pageSize: number;
        totalCount: number;
        totalPages: number;
    };
}>;
type UpdateExamInput = z.infer<typeof updateExamSchema>['body'];
export declare const updateExam: (examId: string, input: UpdateExamInput) => Promise<{
    id: string;
    status: import(".prisma/client").$Enums.ExamStatus;
    description: string | null;
    title: string;
    startAt: Date;
    endAt: Date;
    durationMins: number;
    timingMode: import(".prisma/client").$Enums.TimingMode;
    sectionLockPolicy: import(".prisma/client").$Enums.SectionLockPolicy;
    releaseResults: boolean;
}>;
export declare const deleteExam: (examId: string, force?: boolean) => Promise<{
    message: string;
    deletedAttempts: number;
}>;
/**
 * Ensures default sections exist for an exam (creates them if missing)
 */
export declare const ensureDefaultSections: (examId: string) => Promise<void>;
/**
 * Fetches a single exam's details for editing.
 * Ensures default sections exist before returning.
 */
export declare const getExamById: (examId: string) => Promise<({
    sections: ({
        sectionQuestions: ({
            question: {
                id: string;
                points: Prisma.Decimal;
                createdAt: Date;
                updatedAt: Date;
                examId: string;
                status: import(".prisma/client").$Enums.QuestionStatus;
                type: import(".prisma/client").$Enums.QType;
                order: number;
                prompt: string | null;
                options: Prisma.JsonValue | null;
                correctOptionIds: Prisma.JsonValue | null;
                starterCode: string | null;
                language: string | null;
                testcases: Prisma.JsonValue | null;
                languageHints: Prisma.JsonValue | null;
                wordLimit: number | null;
                mediaAssetId: string | null;
                passageAssetId: string | null;
                maxDurationSec: number | null;
                clozeTemplate: string | null;
                blanks: Prisma.JsonValue | null;
                clozeConfig: Prisma.JsonValue | null;
                config: Prisma.JsonValue | null;
                rubricId: string | null;
                invalidationReason: string | null;
                invalidatedAt: Date | null;
                invalidatedById: string | null;
            };
        } & {
            id: string;
            order: number;
            questionId: string;
            sectionId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        examId: string;
        description: string | null;
        title: string;
        order: number;
        durationMins: number | null;
        startsAt: Date | null;
        endsAt: Date | null;
    })[];
    _count: {
        sections: number;
        attempts: number;
        questions: number;
    };
    questions: {
        id: string;
        points: Prisma.Decimal;
        createdAt: Date;
        updatedAt: Date;
        examId: string;
        status: import(".prisma/client").$Enums.QuestionStatus;
        type: import(".prisma/client").$Enums.QType;
        order: number;
        prompt: string | null;
        options: Prisma.JsonValue | null;
        correctOptionIds: Prisma.JsonValue | null;
        starterCode: string | null;
        language: string | null;
        testcases: Prisma.JsonValue | null;
        languageHints: Prisma.JsonValue | null;
        wordLimit: number | null;
        mediaAssetId: string | null;
        passageAssetId: string | null;
        maxDurationSec: number | null;
        clozeTemplate: string | null;
        blanks: Prisma.JsonValue | null;
        clozeConfig: Prisma.JsonValue | null;
        config: Prisma.JsonValue | null;
        rubricId: string | null;
        invalidationReason: string | null;
        invalidatedAt: Date | null;
        invalidatedById: string | null;
    }[];
    assignments: {
        id: string;
        examId: string;
        assignToAll: boolean;
        cohortYear: number | null;
        cohortDepartment: string | null;
        cohortSection: string | null;
        studentIds: Prisma.JsonValue | null;
    }[];
} & {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    status: import(".prisma/client").$Enums.ExamStatus;
    description: string | null;
    title: string;
    startAt: Date;
    endAt: Date;
    durationMins: number;
    timingMode: import(".prisma/client").$Enums.TimingMode;
    sectionLockPolicy: import(".prisma/client").$Enums.SectionLockPolicy;
    randomizeQuestions: boolean;
    negativeMarkPerWrong: Prisma.Decimal | null;
    maxAttempts: number | null;
    maxTabSwitches: number | null;
    allowedLanguages: Prisma.JsonValue | null;
    releaseResults: boolean;
}) | null>;
/**
 * Fetches a single exam's details for a student.
 * Checks if the student has access to the exam (assigned and published).
 */
export declare const getExamByIdForStudent: (studentId: string, examId: string) => Promise<{
    hasAttempt: boolean;
    attemptId: string | null;
    attemptStatus: import(".prisma/client").$Enums.AttemptStatus | null;
    questionTypes: import(".prisma/client").$Enums.QType[];
    hasSpeakingQuestions: boolean;
    attemptCount: number;
    id: string;
    status: import(".prisma/client").$Enums.ExamStatus;
    description: string | null;
    title: string;
    startAt: Date;
    endAt: Date;
    durationMins: number;
    maxAttempts: number | null;
    allowedLanguages: Prisma.JsonValue;
}>;
export {};
//# sourceMappingURL=exam.service.d.ts.map