import { ExamStatus, Prisma, User } from "@prisma/client";
export declare const createExam: (data: Prisma.ExamCreateInput) => Prisma.Prisma__ExamClient<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    status: import(".prisma/client").$Enums.ExamStatus;
    title: string;
    description: string | null;
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
export declare const updateExamStatus: (examId: string, status: ExamStatus) => Prisma.Prisma__ExamClient<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    status: import(".prisma/client").$Enums.ExamStatus;
    title: string;
    description: string | null;
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
}, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
export declare const findExamById: (examId: string) => Prisma.Prisma__ExamClient<({
    sections: ({
        sectionQuestions: ({
            question: {
                id: string;
                order: number;
                type: import(".prisma/client").$Enums.QType;
                points: Prisma.Decimal;
                prompt: string | null;
            };
        } & {
            id: string;
            order: number;
            sectionId: string;
            questionId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        examId: string;
        order: number;
        title: string;
        description: string | null;
        durationMins: number | null;
        startsAt: Date | null;
        endsAt: Date | null;
    })[];
    _count: {
        sections: number;
        attempts: number;
        questions: number;
    };
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
    title: string;
    description: string | null;
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
        _count: {
            sections: number;
            attempts: number;
            questions: number;
        };
        title: string;
        description: string | null;
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
    questionTypes: import(".prisma/client").$Enums.QType[];
    hasSpeakingQuestions: boolean;
    id: string;
    status: import(".prisma/client").$Enums.ExamStatus;
    title: string;
    description: string | null;
    startAt: Date;
    endAt: Date;
    durationMins: number;
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
        attempts: {
            id: string;
            attemptNo: number;
            submittedAt: Date | null;
            status: import(".prisma/client").$Enums.AttemptStatus;
            score: Prisma.Decimal | null;
            maxScore: Prisma.Decimal | null;
        }[];
        title: string;
        description: string | null;
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
    title: string;
    description: string | null;
    startAt: Date;
    endAt: Date;
    durationMins: number;
    timingMode: import(".prisma/client").$Enums.TimingMode;
    sectionLockPolicy: import(".prisma/client").$Enums.SectionLockPolicy;
}, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
export declare const deleteExamAndChildren: (examId: string) => Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    status: import(".prisma/client").$Enums.ExamStatus;
    title: string;
    description: string | null;
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
}>;
//# sourceMappingURL=exam.repo.d.ts.map