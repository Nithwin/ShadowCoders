/**
 * Fetches all questions for a specific exam.
 */
export declare const listQuestionsForExam: (examId: string) => Promise<{
    id: string;
    order: number;
    type: import(".prisma/client").$Enums.QType;
    points: Prisma.Decimal;
    prompt: string | null;
    options: Prisma.JsonValue;
    correctOptionIds: Prisma.JsonValue;
    starterCode: string | null;
    testcases: Prisma.JsonValue;
    wordLimit: number | null;
}[]>;
import { z } from 'zod';
import { addQuestionsSchema, updateQuestionSchema } from './question.zod';
import { Prisma } from '@prisma/client';
type AddQuestionsInput = z.infer<typeof addQuestionsSchema>['body']['questions'];
export declare const addQuestionsToExam: (examId: string, questions: AddQuestionsInput) => Promise<Prisma.BatchPayload>;
export declare const getQuestionForStudent: (studentId: string, attemptId: string, questionId: string) => Promise<any>;
type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>['body'];
export declare const updateQuestion: (questionId: string, input: UpdateQuestionInput) => Promise<{
    id: string;
    order: number;
    type: import(".prisma/client").$Enums.QType;
    points: Prisma.Decimal;
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