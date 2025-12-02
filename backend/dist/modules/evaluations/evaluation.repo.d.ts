import { Prisma } from '@prisma/client';
/**
 * Creates a new evaluation record for a specific response.
 */
export declare const createEvaluation: (responseId: string, assessorId: string, // The ID of the STAFF user doing the grading
data: Prisma.EvaluationCreateWithoutResponseInput) => Prisma.Prisma__EvaluationClient<{
    id: string;
    score: Prisma.Decimal | null;
    kind: import(".prisma/client").$Enums.EvaluationKind;
    comments: string | null;
    isFinal: boolean;
}, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
//# sourceMappingURL=evaluation.repo.d.ts.map