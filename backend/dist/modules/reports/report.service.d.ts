import { ReportStatus } from '@prisma/client';
export declare const reportService: {
    createReport: (studentId: string, examId: string, questionId: string, description?: string) => Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        examId: string;
        studentId: string;
        status: import(".prisma/client").$Enums.ReportStatus;
        description: string | null;
        questionId: string;
    }>;
    getReports: (filters: {
        examId?: string;
        status?: ReportStatus;
    }) => Promise<({
        question: {
            id: string;
            points: import("@prisma/client/runtime/library").Decimal;
            createdAt: Date;
            updatedAt: Date;
            examId: string;
            status: import(".prisma/client").$Enums.QuestionStatus;
            type: import(".prisma/client").$Enums.QType;
            order: number;
            prompt: string | null;
            options: import("@prisma/client/runtime/library").JsonValue | null;
            correctOptionIds: import("@prisma/client/runtime/library").JsonValue | null;
            starterCode: string | null;
            testcases: import("@prisma/client/runtime/library").JsonValue | null;
            languageHints: import("@prisma/client/runtime/library").JsonValue | null;
            wordLimit: number | null;
            mediaAssetId: string | null;
            passageAssetId: string | null;
            maxDurationSec: number | null;
            clozeTemplate: string | null;
            blanks: import("@prisma/client/runtime/library").JsonValue | null;
            clozeConfig: import("@prisma/client/runtime/library").JsonValue | null;
            config: import("@prisma/client/runtime/library").JsonValue | null;
            rubricId: string | null;
            invalidationReason: string | null;
            invalidatedAt: Date | null;
            invalidatedById: string | null;
        };
        exam: {
            id: string;
            title: string;
        };
        student: {
            name: string | null;
            id: string;
            reg_no: string | null;
            email: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        examId: string;
        studentId: string;
        status: import(".prisma/client").$Enums.ReportStatus;
        description: string | null;
        questionId: string;
    })[]>;
    updateStatus: (reportId: string, status: ReportStatus) => Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        examId: string;
        studentId: string;
        status: import(".prisma/client").$Enums.ReportStatus;
        description: string | null;
        questionId: string;
    }>;
};
//# sourceMappingURL=report.service.d.ts.map