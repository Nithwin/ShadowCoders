import { ExamStatus, Prisma, User } from "@prisma/client";
export declare const createExam: (data: Prisma.ExamCreateInput) => Prisma.Prisma__ExamClient<{
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
}, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
export declare const createExamAssignment: (examId: string, assignmentData: Omit<Prisma.ExamAssignmentCreateManyInput, "examId">) => Prisma.Prisma__ExamAssignmentClient<{
    id: string;
    examId: string;
    assignToAll: boolean;
    cohortYear: number | null;
    cohortDepartment: string | null;
    cohortSection: string | null;
    studentIds: Prisma.JsonValue | null;
}, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
export declare const deleteExamAssignment: (assignmentId: string) => Prisma.Prisma__ExamAssignmentClient<{
    id: string;
    examId: string;
    assignToAll: boolean;
    cohortYear: number | null;
    cohortDepartment: string | null;
    cohortSection: string | null;
    studentIds: Prisma.JsonValue | null;
}, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
export declare const updateExamStatus: (examId: string, status: ExamStatus) => Prisma.Prisma__ExamClient<{
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
}, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
export declare const findExamById: (examId: string) => Prisma.Prisma__ExamClient<({
    sections: ({
        sectionQuestions: ({
            question: {
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
                language: string | null;
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
            };
        } & {
            id: string;
            order: number;
            questionId: string;
            sectionId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        examId: string;
        description: string | null;
        title: string;
        order: number;
        durationMins: number | null;
        startsAt: Date | null;
        endsAt: Date | null;
    })[];
    _count: {
        sections: number;
        attempts: number;
        questions: number;
    };
    questions: {
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
        language: string | null;
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
    }[];
    assignments: {
        id: string;
        examId: string;
        assignToAll: boolean;
        cohortYear: number | null;
        cohortDepartment: string | null;
        cohortSection: string | null;
        studentIds: Prisma.JsonValue | null;
    }[];
} & {
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
}) | null, null, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
export declare const listExams: (params: {
    status?: ExamStatus;
    searchQuery?: string;
    page: number;
    pageSize: number;
}) => Promise<{
    exams: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ExamStatus;
        description: string | null;
        title: string;
        _count: {
            sections: number;
            attempts: number;
            questions: number;
        };
        startAt: Date;
        endAt: Date;
        durationMins: number;
        timingMode: import(".prisma/client").$Enums.TimingMode;
        sectionLockPolicy: import(".prisma/client").$Enums.SectionLockPolicy;
        randomizeQuestions: boolean;
        negativeMarkPerWrong: Prisma.Decimal | null;
    }[];
    totalCount: number;
}>;
export declare const findExamByIdForStudent: (params: {
    examId: string;
    student: Pick<User, "id" | "year" | "department" | "section">;
}) => Promise<{
    hasAttempt: boolean;
    attemptId: string | null;
    attemptStatus: import(".prisma/client").$Enums.AttemptStatus | null;
    questionTypes: import(".prisma/client").$Enums.QType[];
    hasSpeakingQuestions: boolean;
    attemptCount: number;
    id: string;
    status: import(".prisma/client").$Enums.ExamStatus;
    description: string | null;
    title: string;
    startAt: Date;
    endAt: Date;
    durationMins: number;
    maxAttempts: number | null;
    allowedLanguages: Prisma.JsonValue;
} | null>;
export declare const listExamsForStudent: (params: {
    student: Pick<User, "id" | "year" | "department" | "section">;
    filter?: "UPCOMING" | "LIVE" | "COMPLETED";
    searchQuery?: string;
    page: number;
    pageSize: number;
}) => Promise<{
    exams: {
        id: string;
        status: import(".prisma/client").$Enums.ExamStatus;
        description: string | null;
        title: string;
        attempts: {
            id: string;
            attemptNo: number;
            submittedAt: Date | null;
            status: import(".prisma/client").$Enums.AttemptStatus;
            score: Prisma.Decimal | null;
            maxScore: Prisma.Decimal | null;
        }[];
        startAt: Date;
        endAt: Date;
        durationMins: number;
        maxAttempts: number | null;
    }[];
    totalCount: number;
}>;
export declare const updateExam: (examId: string, data: Prisma.ExamUpdateInput) => Prisma.Prisma__ExamClient<{
    id: string;
    status: import(".prisma/client").$Enums.ExamStatus;
    description: string | null;
    title: string;
    startAt: Date;
    endAt: Date;
    durationMins: number;
    timingMode: import(".prisma/client").$Enums.TimingMode;
    sectionLockPolicy: import(".prisma/client").$Enums.SectionLockPolicy;
    releaseResults: boolean;
}, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
export declare const deleteExamAndChildren: (examId: string) => Promise<{
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
//# sourceMappingURL=exam.repo.d.ts.map