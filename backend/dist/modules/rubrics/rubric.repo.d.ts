import { Prisma } from '@prisma/client';
/**
 * Creates a new rubric record in the database.
 */
export declare const createRubric: (data: Prisma.RubricCreateInput) => Prisma.Prisma__RubricClient<{
    name: string;
    id: string;
    createdAt: Date;
    criteria: Prisma.JsonValue;
}, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
/**
 * Lists all rubrics with pagination and search
 */
export declare const listRubrics: (params: {
    page: number;
    pageSize: number;
    searchQuery?: string;
}) => Promise<{
    rubrics: {
        name: string;
        id: string;
        createdAt: Date;
        _count: {
            questions: number;
            evaluations: number;
        };
        criteria: Prisma.JsonValue;
    }[];
    totalCount: number;
}>;
/**
 * Gets a single rubric by ID
 */
export declare const getRubricById: (id: string) => Prisma.Prisma__RubricClient<{
    name: string;
    id: string;
    createdAt: Date;
    _count: {
        questions: number;
        evaluations: number;
    };
    criteria: Prisma.JsonValue;
} | null, null, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
/**
 * Updates a rubric
 */
export declare const updateRubric: (id: string, data: Prisma.RubricUpdateInput) => Prisma.Prisma__RubricClient<{
    name: string;
    id: string;
    createdAt: Date;
    criteria: Prisma.JsonValue;
}, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
/**
 * Deletes a rubric
 */
export declare const deleteRubric: (id: string) => Prisma.Prisma__RubricClient<{
    name: string;
    id: string;
    createdAt: Date;
    createdBy: string | null;
    criteria: Prisma.JsonValue;
}, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
//# sourceMappingURL=rubric.repo.d.ts.map