/**
 * Fetches all questions for a specific exam.
 */
export declare const listQuestionsForExam: (examId: string) => Promise<{
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
    config: Prisma.JsonValue;
}[]>;
import { z } from 'zod';
import { addQuestionsSchema, updateQuestionSchema } from './question.zod';
import { Prisma } from '@prisma/client';
type AddQuestionsInput = z.infer<typeof addQuestionsSchema>['body']['questions'];
export declare const addQuestionsToExam: (examId: string, questions: AddQuestionsInput) => Promise<{
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
}[]>;
export declare const getQuestionForStudent: (studentId: string, attemptId: string, questionId: string) => Promise<any>;
type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>['body'];
export declare const updateQuestion: (questionId: string, input: UpdateQuestionInput) => Promise<{
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
}>;
export declare const deleteQuestion: (questionId: string) => Promise<{
    message: string;
}>;
export {};
//# sourceMappingURL=question.service.d.ts.map