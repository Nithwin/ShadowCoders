import { Prisma } from "@prisma/client";
import z from "zod";
import { listAttemptsSchema, submitAnswerSchema, resetAttemptsSchema, resumeAttemptsSchema } from "./attempt.zod";
export declare const startAttempt: (studentId: string, examId: string) => Promise<{
    id: string;
    examId: string;
    studentId: string;
    attemptNo: number;
    startedAt: Date;
    status: import(".prisma/client").$Enums.AttemptStatus;
    orderMap: Prisma.JsonValue;
} | null>;
type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>["body"];
export declare const submitAnswer: (studentId: string, attemptId: string, input: SubmitAnswerInput) => Promise<{
    code: string | null;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    type: import(".prisma/client").$Enums.QType;
    language: string | null;
    questionId: string;
    attemptId: string;
    answer: Prisma.JsonValue | null;
    chosenOptionIds: Prisma.JsonValue | null;
    textAnswer: string | null;
    audioAssetId: string | null;
    gradingMode: import(".prisma/client").$Enums.GradingMode | null;
    verdict: string | null;
    earnedPoints: Prisma.Decimal | null;
    manualAdjustment: Prisma.Decimal | null;
    feedback: string | null;
    judgeRunId: string | null;
}>;
export declare const submitAttempt: (studentId: string, attemptId: string, submissionReason?: string) => Promise<{
    id: string;
    examId: string;
    studentId: string;
    attemptNo: number;
    startedAt: Date;
    submittedAt: Date | null;
    status: import(".prisma/client").$Enums.AttemptStatus;
    submissionType: import(".prisma/client").$Enums.SubmissionType;
    submissionReason: string | null;
    score: Prisma.Decimal | null;
    maxScore: Prisma.Decimal | null;
    timeSpentSec: number;
    orderMap: Prisma.JsonValue | null;
}>;
export declare const forceSubmitAttempt: (attemptId: string, submissionReason?: string) => Promise<{
    id: string;
    examId: string;
    studentId: string;
    attemptNo: number;
    startedAt: Date;
    submittedAt: Date | null;
    status: import(".prisma/client").$Enums.AttemptStatus;
    submissionType: import(".prisma/client").$Enums.SubmissionType;
    submissionReason: string | null;
    score: Prisma.Decimal | null;
    maxScore: Prisma.Decimal | null;
    timeSpentSec: number;
    orderMap: Prisma.JsonValue | null;
}>;
export declare const getAttemptDetails: (studentId: string, attemptId: string) => Promise<{
    id: string;
    examId: string;
    studentId: string;
    startedAt: Date;
    submittedAt: Date | null;
    status: import(".prisma/client").$Enums.AttemptStatus;
    score: Prisma.Decimal | null;
    maxScore: Prisma.Decimal | null;
    exam: {
        id: string;
        title: string;
        sections: {
            id: string;
            title: string;
            order: number;
            sectionQuestions: {
                question: {
                    id: string;
                    order: number;
                };
                questionId: string;
            }[];
        }[];
        durationMins: number;
        maxAttempts: number | null;
        allowedLanguages: Prisma.JsonValue;
        questions: {
            id: string;
            order: number;
        }[];
    };
    responses: {
        type: import(".prisma/client").$Enums.QType;
        questionId: string;
        answer: Prisma.JsonValue;
        verdict: string | null;
        earnedPoints: Prisma.Decimal | null;
        feedback: string | null;
    }[];
}>;
export declare const getQuestionById: (questionId: string) => Prisma.Prisma__QuestionClient<{
    id: string;
    points: Prisma.Decimal;
    examId: string;
    type: import(".prisma/client").$Enums.QType;
    order: number;
    prompt: string | null;
    options: Prisma.JsonValue;
    correctOptionIds: Prisma.JsonValue;
    starterCode: string | null;
    testcases: Prisma.JsonValue;
    languageHints: Prisma.JsonValue;
    wordLimit: number | null;
    mediaAssetId: string | null;
    passageAssetId: string | null;
    maxDurationSec: number | null;
    clozeTemplate: string | null;
    blanks: Prisma.JsonValue;
    config: Prisma.JsonValue;
    mediaAsset: {
        id: string;
        kind: import(".prisma/client").$Enums.AssetKind;
        url: string;
    } | null;
} | null, null, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
export declare const getQuestionForStudent: (attemptId: string, questionId: string, studentId: string) => Promise<any>;
export declare const getAttemptResults: (studentId: string, attemptId: string) => Promise<any>;
/**
 * Calculate the rank of a student for a specific exam
 * Ranking is based on:
 * 1. Score (descending) - higher score = better rank
 * 2. Time spent (ascending) - faster completion = better rank (if same score)
 * 3. Submission time (ascending) - earlier submission = better rank (if same score and time)
 */
export declare const calculateStudentRank: (examId: string, studentId: string) => Promise<{
    rank: number | null;
    totalParticipants: number;
}>;
/**
 * Get leaderboard for an exam
 * Returns top N students ranked by their best attempt
 */
export declare const getExamLeaderboard: (examId: string, studentId: string, limit?: number) => Promise<{
    leaderboard: Array<{
        rank: number;
        studentId: string;
        studentName: string | null;
        studentEmail: string;
        studentRegNo: string | null;
        score: number;
        maxScore: number;
        timeSpentSec: number;
        submittedAt: Date | null;
        isCurrentStudent: boolean;
    }>;
    currentStudentRank: number | null;
    totalParticipants: number;
}>;
type ListAttemptsQuery = z.infer<typeof listAttemptsSchema>['query'];
export declare const listAttemptsForExam: (examId: string, query: ListAttemptsQuery) => Promise<{
    data: {
        score: number;
        id: string;
        attemptNo: number;
        startedAt: Date;
        submittedAt: Date | null;
        status: import(".prisma/client").$Enums.AttemptStatus;
        submissionType: import(".prisma/client").$Enums.SubmissionType;
        submissionReason: string | null;
        maxScore: Prisma.Decimal | null;
        student: {
            name: string | null;
            id: string;
            reg_no: string | null;
            email: string;
        };
    }[];
    meta: {
        page: number;
        pageSize: number;
        totalCount: number;
        totalPages: number;
    };
}>;
export declare const getStudentAttempts: (studentId: string) => Promise<{
    score: number;
    id: string;
    startedAt: Date;
    submittedAt: Date | null;
    status: import(".prisma/client").$Enums.AttemptStatus;
    maxScore: Prisma.Decimal | null;
    exam: {
        id: string;
        title: string;
    };
}[]>;
export declare const getAttemptForAdmin: (attemptId: string) => Promise<{
    id: string;
    startedAt: Date;
    submittedAt: Date | null;
    status: import(".prisma/client").$Enums.AttemptStatus;
    submissionType: import(".prisma/client").$Enums.SubmissionType;
    submissionReason: string | null;
    score: Prisma.Decimal | null;
    maxScore: Prisma.Decimal | null;
    exam: {
        id: string;
        title: string;
    };
    student: {
        name: string | null;
        id: string;
        reg_no: string | null;
        email: string;
    };
    responses: {
        id: string;
        question: {
            id: string;
            points: Prisma.Decimal;
            type: import(".prisma/client").$Enums.QType;
            order: number;
            prompt: string | null;
            options: Prisma.JsonValue;
            correctOptionIds: Prisma.JsonValue;
            starterCode: string | null;
            testcases: Prisma.JsonValue;
            wordLimit: number | null;
            blanks: Prisma.JsonValue;
        };
        answer: Prisma.JsonValue;
        verdict: string | null;
        earnedPoints: Prisma.Decimal | null;
        feedback: string | null;
        audioAsset: {
            id: string;
            kind: import(".prisma/client").$Enums.AssetKind;
            url: string;
        } | null;
        evaluations: {
            id: string;
            score: Prisma.Decimal | null;
            kind: import(".prisma/client").$Enums.EvaluationKind;
            breakdown: Prisma.JsonValue;
            comments: string | null;
            isFinal: boolean;
            assessor: {
                name: string | null;
                id: string;
                role: import(".prisma/client").$Enums.Role;
            } | null;
        }[];
    }[];
}>;
type ResetAttemptsInput = z.infer<typeof resetAttemptsSchema>['body'];
export declare const resetAttempts: (input: ResetAttemptsInput) => Promise<{
    deletedCount: number;
    message: string;
}>;
type ResumeAttemptsInput = z.infer<typeof resumeAttemptsSchema>['body'];
export declare const resumeAttempts: (input: ResumeAttemptsInput) => Promise<{
    resumedCount: number;
    message: string;
}>;
export declare const runCode: (studentId: string, attemptId: string, questionId: string, code: string, language: string, customInput?: string, runAllTests?: boolean) => Promise<{
    passed: number;
    total: number;
    testResults: {
        input: string;
        expectedOutput: string;
        actualOutput: string | null;
        passed: boolean;
        status: string;
        error: string | undefined;
    }[];
    message: string;
} | {
    passed: number;
    total: number;
    testResults: {
        input: string;
        expectedOutput: string;
        actualOutput: string | null;
        passed: boolean;
        error?: string;
        status: string;
        isHidden?: boolean;
        testCaseIndex?: number;
        errorType?: "TLE" | "Runtime Error" | "Compilation Error" | "Wrong Answer" | "Accepted";
    }[];
    message: string;
}>;
export {};
//# sourceMappingURL=attempt.service.d.ts.map