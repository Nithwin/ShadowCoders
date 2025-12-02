import { Prisma } from '@prisma/client';
/**
 * Creates a new grading job in the database.
 */
export declare const createGradingJob: (data: Prisma.GradingJobCreateInput) => Prisma.Prisma__GradingJobClient<{
    id: string;
    status: string;
}, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
/**
 * Updates a grading job with the result from the code judge.
 */
export declare const updateGradingJob: (jobId: string, status: string, result: Prisma.JsonValue) => Prisma.Prisma__GradingJobClient<{
    result: Prisma.JsonValue;
    id: string;
    status: string;
}, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
//# sourceMappingURL=grading.repo.d.ts.map