import { z } from 'zod';
import { createExamSchema, assignExamSchema, listExamsSchema, studentListExamsSchema, updateExamSchema } from "./exam.zod";
import { Prisma } from "@prisma/client";
type CreateExamInput = z.infer<typeof createExamSchema>["body"];
export declare const createExam: (input: CreateExamInput) => Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    status: import(".prisma/client").$Enums.ExamStatus;
    title: string;
    description: string | null;
    startAt: Date;
    endAt: Date;
    durationMins: number;
    timingMode: import(".prisma/client").$Enums.TimingMode;
    sectionLockPolicy: import(".prisma/client").$Enums.SectionLockPolicy;
    randomizeQuestions: boolean;
    negativeMarkPerWrong: Prisma.Decimal | null;
    maxAttempts: number | null;
    allowedLanguages: Prisma.JsonValue | null;
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
export declare const pubishExam: (examId: string) => Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    status: import(".prisma/client").$Enums.ExamStatus;
    title: string;
    description: string | null;
    startAt: Date;
    endAt: Date;
    durationMins: number;
    timingMode: import(".prisma/client").$Enums.TimingMode;
    sectionLockPolicy: import(".prisma/client").$Enums.SectionLockPolicy;
    randomizeQuestions: boolean;
    negativeMarkPerWrong: Prisma.Decimal | null;
    maxAttempts: number | null;
    allowedLanguages: Prisma.JsonValue | null;
}>;
type ListExamQuery = z.infer<typeof listExamsSchema>["query"];
export declare const listExams: (query: ListExamQuery) => Promise<{
    data: {
        negativeMarkPerWrong: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ExamStatus;
        _count: {
            sections: number;
            attempts: number;
            questions: number;
        };
        title: string;
        description: string | null;
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
        title: string;
        description: string | null;
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
    title: string;
    description: string | null;
    startAt: Date;
    endAt: Date;
    durationMins: number;
    timingMode: import(".prisma/client").$Enums.TimingMode;
    sectionLockPolicy: import(".prisma/client").$Enums.SectionLockPolicy;
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
                order: number;
                type: import(".prisma/client").$Enums.QType;
                points: Prisma.Decimal;
                prompt: string | null;
            };
        } & {
            id: string;
            order: number;
            sectionId: string;
            questionId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        examId: string;
        order: number;
        title: string;
        description: string | null;
        durationMins: number | null;
        startsAt: Date | null;
        endsAt: Date | null;
    })[];
    _count: {
        sections: number;
        attempts: number;
        questions: number;
    };
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
    title: string;
    description: string | null;
    startAt: Date;
    endAt: Date;
    durationMins: number;
    timingMode: import(".prisma/client").$Enums.TimingMode;
    sectionLockPolicy: import(".prisma/client").$Enums.SectionLockPolicy;
    randomizeQuestions: boolean;
    negativeMarkPerWrong: Prisma.Decimal | null;
    maxAttempts: number | null;
    allowedLanguages: Prisma.JsonValue | null;
}) | null>;
/**
 * Fetches a single exam's details for a student.
 * Checks if the student has access to the exam (assigned and published).
 */
export declare const getExamByIdForStudent: (studentId: string, examId: string) => Promise<{
    hasAttempt: boolean;
    attemptId: string | null;
    questionTypes: import(".prisma/client").$Enums.QType[];
    hasSpeakingQuestions: boolean;
    id: string;
    status: import(".prisma/client").$Enums.ExamStatus;
    title: string;
    description: string | null;
    startAt: Date;
    endAt: Date;
    durationMins: number;
    allowedLanguages: Prisma.JsonValue;
}>;
export {};
//# sourceMappingURL=exam.service.d.ts.map