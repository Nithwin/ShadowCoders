import { z } from 'zod';
import { runCodeSchema } from './grading.zod';
import { Prisma } from '@prisma/client';
type RunCodeInput = z.infer<typeof runCodeSchema>['body'];
/**
 * Handles the logic for running a student's code submission.
 */
export declare const runCode: (studentId: string, attemptId: string, input: RunCodeInput) => Promise<Prisma.JsonValue>;
export declare const gradeEssay: (responseId: string) => Promise<{
    jobId: string;
    status: string;
    message: string;
}>;
export declare const overrideResponseGrade: (responseId: string, score: number, feedback?: string) => Promise<{
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
export {};
//# sourceMappingURL=grading.service.d.ts.map