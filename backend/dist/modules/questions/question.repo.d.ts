/**
 * Lists all questions for a specific exam.
 * Returns all fields needed for editing, including testcases, options, etc.
 */
export declare const listQuestionsForExam: (examId: string) => Prisma.PrismaPromise<{
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
import { Prisma } from "@prisma/client";
export declare const createManyQuestions: (examId: string, questionsData: Prisma.QuestionCreateManyInput[]) => Promise<{
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
export declare const getQuestionById: (questionId: string) => Prisma.Prisma__QuestionClient<{
    id: string;
    points: Prisma.Decimal;
    examId: string;
    type: import(".prisma/client").$Enums.QType;
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
    reports: {
        id: string;
        status: import(".prisma/client").$Enums.ReportStatus;
    }[];
} | null, null, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
export declare const updateQuestion: (questionId: string, data: Prisma.QuestionUpdateInput) => Prisma.Prisma__QuestionClient<{
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
}, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
export declare const deleteQuestion: (questionId: string) => Promise<{
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
}>;
//# sourceMappingURL=question.repo.d.ts.map