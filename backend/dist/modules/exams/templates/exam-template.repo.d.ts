import { Prisma } from "@prisma/client";
export declare const createTemplate: (data: Prisma.ExamTemplateCreateInput) => Prisma.Prisma__ExamTemplateClient<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    description: string | null;
    title: string;
    structure: Prisma.JsonValue;
    isPublic: boolean;
    createdBy: string;
}, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
export declare const findTemplateById: (id: string) => Prisma.Prisma__ExamTemplateClient<({
    creator: {
        name: string | null;
        id: string;
        email: string;
    };
} & {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    description: string | null;
    title: string;
    structure: Prisma.JsonValue;
    isPublic: boolean;
    createdBy: string;
}) | null, null, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
export declare const listTemplates: (params: {
    userId: string;
    isPublic?: boolean;
    searchQuery?: string;
    page: number;
    pageSize: number;
}) => Promise<{
    templates: ({
        creator: {
            name: string | null;
            id: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        title: string;
        structure: Prisma.JsonValue;
        isPublic: boolean;
        createdBy: string;
    })[];
    totalCount: number;
}>;
export declare const deleteTemplate: (id: string) => Prisma.Prisma__ExamTemplateClient<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    description: string | null;
    title: string;
    structure: Prisma.JsonValue;
    isPublic: boolean;
    createdBy: string;
}, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
//# sourceMappingURL=exam-template.repo.d.ts.map