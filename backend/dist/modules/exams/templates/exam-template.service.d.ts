import { Prisma } from "@prisma/client";
export declare const createTemplateFromExam: (examId: string, userId: string, metadata: {
    title: string;
    description?: string;
    isPublic: boolean;
}) => Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    description: string | null;
    title: string;
    structure: Prisma.JsonValue;
    isPublic: boolean;
    createdBy: string;
}>;
export declare const createExamFromTemplate: (templateId: string, userId: string, examData: {
    title: string;
    startAt: Date;
    endAt: Date;
}) => Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    status: import(".prisma/client").$Enums.ExamStatus;
    description: string | null;
    title: string;
    startAt: Date;
    endAt: Date;
    durationMins: number;
    timingMode: import(".prisma/client").$Enums.TimingMode;
    sectionLockPolicy: import(".prisma/client").$Enums.SectionLockPolicy;
    randomizeQuestions: boolean;
    negativeMarkPerWrong: Prisma.Decimal | null;
    maxAttempts: number | null;
    maxTabSwitches: number | null;
    allowedLanguages: Prisma.JsonValue | null;
    releaseResults: boolean;
}>;
export declare const listTemplates: (userId: string, query: any) => Promise<{
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
export declare const deleteTemplate: (templateId: string, userId: string) => Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    description: string | null;
    title: string;
    structure: Prisma.JsonValue;
    isPublic: boolean;
    createdBy: string;
}>;
export declare const getTemplateById: (templateId: string) => Promise<{
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
}>;
//# sourceMappingURL=exam-template.service.d.ts.map