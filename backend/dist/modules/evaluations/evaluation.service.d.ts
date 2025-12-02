import { z } from 'zod';
import { createEvaluationSchema } from './evaluation.zod';
import { Prisma } from '@prisma/client';
type CreateEvaluationInput = z.infer<typeof createEvaluationSchema>['body'];
export declare const createManualEvaluation: (responseId: string, assessorId: string, // The ID of the STAFF user
input: CreateEvaluationInput) => Promise<{
    id: string;
    createdAt: Date;
    score: Prisma.Decimal | null;
    rubricId: string | null;
    responseId: string;
    kind: import(".prisma/client").$Enums.EvaluationKind;
    assessorId: string | null;
    breakdown: Prisma.JsonValue | null;
    comments: string | null;
    isFinal: boolean;
}>;
export {};
//# sourceMappingURL=evaluation.service.d.ts.map