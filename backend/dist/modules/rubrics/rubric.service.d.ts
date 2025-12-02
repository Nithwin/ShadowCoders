import { z } from 'zod';
import { createRubricSchema, updateRubricSchema, listRubricsSchema } from './rubric.zod';
import { Prisma } from '@prisma/client';
type CreateRubricInput = z.infer<typeof createRubricSchema>['body'];
type UpdateRubricInput = z.infer<typeof updateRubricSchema>['body'];
type ListRubricsQuery = z.infer<typeof listRubricsSchema>['query'];
export declare const createRubric: (creatorId: string, // The ID of the STAFF user
input: CreateRubricInput) => Promise<{
    name: string;
    id: string;
    createdAt: Date;
    criteria: Prisma.JsonValue;
}>;
export declare const listRubrics: (query: ListRubricsQuery) => Promise<{
    data: {
        name: string;
        id: string;
        createdAt: Date;
        _count: {
            questions: number;
            evaluations: number;
        };
        criteria: Prisma.JsonValue;
    }[];
    meta: {
        page: number;
        pageSize: number;
        totalCount: number;
        totalPages: number;
    };
}>;
export declare const getRubricById: (id: string) => Promise<{
    name: string;
    id: string;
    createdAt: Date;
    _count: {
        questions: number;
        evaluations: number;
    };
    criteria: Prisma.JsonValue;
}>;
export declare const updateRubric: (id: string, input: UpdateRubricInput) => Promise<{
    name: string;
    id: string;
    createdAt: Date;
    criteria: Prisma.JsonValue;
}>;
export declare const deleteRubric: (id: string) => Promise<{
    message: string;
}>;
export {};
//# sourceMappingURL=rubric.service.d.ts.map