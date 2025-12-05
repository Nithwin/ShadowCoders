import { Prisma, QType } from "@prisma/client";
export declare const createAttempt: (data: Prisma.AttemptCreateInput) => Prisma.Prisma__AttemptClient<{
    id: string;
    examId: string;
    studentId: string;
    attemptNo: number;
    startedAt: Date;
    status: import(".prisma/client").$Enums.AttemptStatus;
    orderMap: Prisma.JsonValue;
}, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
export declare const upsertResponse: (data: {
    attemptId: string;
    questionId: string;
    type: QType;
    answer: Prisma.InputJsonValue | Prisma.NullTypes.JsonNull;
    audioAssetId?: string;
}) => Promise<{
    code: string | null;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    type: import(".prisma/client").$Enums.QType;
    questionId: string;
    attemptId: string;
    answer: Prisma.JsonValue | null;
    chosenOptionIds: Prisma.JsonValue | null;
    language: string | null;
    textAnswer: string | null;
    audioAssetId: string | null;
    gradingMode: import(".prisma/client").$Enums.GradingMode | null;
    verdict: string | null;
    earnedPoints: Prisma.Decimal | null;
    manualAdjustment: Prisma.Decimal | null;
    feedback: string | null;
    judgeRunId: string | null;
}>;
export declare const getAttemptDetails: (attemptId: string) => Prisma.Prisma__AttemptClient<{
    id: string;
    examId: string;
    studentId: string;
    startedAt: Date;
    submittedAt: Date | null;
    status: import(".prisma/client").$Enums.AttemptStatus;
    score: Prisma.Decimal | null;
    maxScore: Prisma.Decimal | null;
    exam: {
        id: string;
        title: string;
        sections: {
            id: string;
            order: number;
            title: string;
            sectionQuestions: {
                question: {
                    id: string;
                    order: number;
                };
                questionId: string;
            }[];
        }[];
        durationMins: number;
        maxAttempts: number | null;
        allowedLanguages: Prisma.JsonValue;
        questions: {
            id: string;
            order: number;
        }[];
    };
    responses: {
        type: import(".prisma/client").$Enums.QType;
        questionId: string;
        answer: Prisma.JsonValue;
        verdict: string | null;
        earnedPoints: Prisma.Decimal | null;
        feedback: string | null;
    }[];
} | null, null, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
export declare const getAttemptForSubmission: (attemptId: string) => Prisma.Prisma__AttemptClient<{
    id: string;
    examId: string;
    studentId: string;
    startedAt: Date;
    status: import(".prisma/client").$Enums.AttemptStatus;
    exam: {
        questions: {
            id: string;
            type: import(".prisma/client").$Enums.QType;
            points: Prisma.Decimal;
            correctOptionIds: Prisma.JsonValue;
            testcases: Prisma.JsonValue;
        }[];
    };
    responses: {
        type: import(".prisma/client").$Enums.QType;
        questionId: string;
        answer: Prisma.JsonValue;
    }[];
} | null, null, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
export declare const updateAttemptOnSubmit: (attemptId: string, score: number, maxScore: number) => Prisma.Prisma__AttemptClient<{
    id: string;
    studentId: string;
    startedAt: Date;
    submittedAt: Date | null;
    status: import(".prisma/client").$Enums.AttemptStatus;
    score: Prisma.Decimal | null;
    maxScore: Prisma.Decimal | null;
    exam: {
        title: string;
    };
    responses: {
        question: {
            id: string;
            order: number;
            type: import(".prisma/client").$Enums.QType;
            points: Prisma.Decimal;
            prompt: string | null;
        };
        questionId: string;
        answer: Prisma.JsonValue;
        verdict: string | null;
        earnedPoints: Prisma.Decimal | null;
        feedback: string | null;
        evaluations: {
            score: Prisma.Decimal | null;
            kind: import(".prisma/client").$Enums.EvaluationKind;
            breakdown: Prisma.JsonValue;
            comments: string | null;
            isFinal: boolean;
        }[];
    }[];
}, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
export declare const listAttemptsForExam: (params: {
    examId: string;
    page: number;
    pageSize: number;
}) => Promise<{
    attempts: {
        id: string;
        startedAt: Date;
        submittedAt: Date | null;
        status: import(".prisma/client").$Enums.AttemptStatus;
        score: Prisma.Decimal | null;
        maxScore: Prisma.Decimal | null;
        student: {
            name: string | null;
            id: string;
            reg_no: string | null;
            email: string;
        };
    }[];
    totalCount: number;
}>;
export declare const getStudentAttempts: (studentId: string) => Promise<{
    id: string;
    startedAt: Date;
    submittedAt: Date | null;
    status: import(".prisma/client").$Enums.AttemptStatus;
    score: Prisma.Decimal | null;
    maxScore: Prisma.Decimal | null;
    exam: {
        id: string;
        title: string;
    };
}[]>;
export declare const getFullAttemptForAdmin: (attemptId: string) => Prisma.Prisma__AttemptClient<{
    id: string;
    startedAt: Date;
    submittedAt: Date | null;
    status: import(".prisma/client").$Enums.AttemptStatus;
    score: Prisma.Decimal | null;
    maxScore: Prisma.Decimal | null;
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
    responses: {
        id: string;
        question: {
            id: string;
            order: number;
            type: import(".prisma/client").$Enums.QType;
            points: Prisma.Decimal;
            prompt: string | null;
            options: Prisma.JsonValue;
            correctOptionIds: Prisma.JsonValue;
            starterCode: string | null;
            testcases: Prisma.JsonValue;
            wordLimit: number | null;
            blanks: Prisma.JsonValue;
        };
        answer: Prisma.JsonValue;
        verdict: string | null;
        earnedPoints: Prisma.Decimal | null;
        feedback: string | null;
        audioAsset: {
            id: string;
            kind: import(".prisma/client").$Enums.AssetKind;
            url: string;
        } | null;
        evaluations: {
            id: string;
            score: Prisma.Decimal | null;
            kind: import(".prisma/client").$Enums.EvaluationKind;
            breakdown: Prisma.JsonValue;
            comments: string | null;
            isFinal: boolean;
            assessor: {
                name: string | null;
                id: string;
                role: import(".prisma/client").$Enums.Role;
            } | null;
        }[];
    }[];
} | null, null, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
export declare const getAttemptResults: (attemptId: string) => Prisma.Prisma__AttemptClient<{
    id: string;
    studentId: string;
    startedAt: Date;
    submittedAt: Date | null;
    status: import(".prisma/client").$Enums.AttemptStatus;
    submissionType: import(".prisma/client").$Enums.SubmissionType;
    submissionReason: string | null;
    score: Prisma.Decimal | null;
    maxScore: Prisma.Decimal | null;
    exam: {
        id: string;
        title: string;
        maxAttempts: number | null;
    };
    responses: {
        id: string;
        question: {
            id: string;
            order: number;
            type: import(".prisma/client").$Enums.QType;
            points: Prisma.Decimal;
            prompt: string | null;
            options: Prisma.JsonValue;
            correctOptionIds: Prisma.JsonValue;
            starterCode: string | null;
            testcases: Prisma.JsonValue;
            blanks: Prisma.JsonValue;
        };
        questionId: string;
        answer: Prisma.JsonValue;
        verdict: string | null;
        earnedPoints: Prisma.Decimal | null;
        feedback: string | null;
        evaluations: {
            id: string;
            score: Prisma.Decimal | null;
            kind: import(".prisma/client").$Enums.EvaluationKind;
            breakdown: Prisma.JsonValue;
            comments: string | null;
            isFinal: boolean;
        }[];
    }[];
} | null, null, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
//# sourceMappingURL=attempt.repo.d.ts.map