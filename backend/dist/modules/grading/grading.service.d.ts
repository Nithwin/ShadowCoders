import { z } from 'zod';
import { runCodeSchema } from './grading.zod';
import { Prisma } from '@prisma/client';
type RunCodeInput = z.infer<typeof runCodeSchema>['body'];
/**
 * Handles the logic for running a student's code submission.
 */
export declare const runCode: (studentId: string, attemptId: string, input: RunCodeInput) => Promise<Prisma.JsonValue>;
export {};
//# sourceMappingURL=grading.service.d.ts.map