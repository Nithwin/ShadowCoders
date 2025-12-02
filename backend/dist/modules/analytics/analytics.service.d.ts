/**
 * Calculate question difficulty (p-value) - proportion of students who answered correctly
 * Range: 0 (very difficult) to 1 (very easy)
 */
export declare const calculateQuestionDifficulty: (questionId: string) => Promise<number | null>;
/**
 * Calculate discrimination index - ability to distinguish between high and low performers
 * Range: -1 (high performers do worse) to +1 (high performers do better)
 * Values > 0.3 are considered good discrimination
 */
export declare const calculateDiscriminationIndex: (questionId: string) => Promise<number | null>;
/**
 * Get question performance metrics for an exam
 */
export declare const getQuestionPerformanceMetrics: (examId: string) => Promise<{
    questionId: string;
    questionOrder: number;
    questionPrompt: string;
    questionType: import(".prisma/client").$Enums.QType;
    totalPoints: number;
    totalAttempts: number;
    averageScore: number;
    averagePercentage: number;
    passRate: number;
    averageTimeSpent: number;
    difficulty: number | null;
    discriminationIndex: number | null;
}[]>;
/**
 * Get student performance trends over time for an exam
 */
export declare const getStudentPerformanceTrends: (examId: string) => Promise<{
    attemptNumber: number;
    studentId: string;
    studentName: string;
    studentRegNo: string | null;
    score: number;
    maxScore: number;
    percentage: number;
    submittedAt: Date | null;
}[]>;
/**
 * Get time spent analysis per question
 */
export declare const getTimeSpentAnalysis: (examId: string) => Promise<{
    questionId: string;
    questionOrder: number;
    questionType: import(".prisma/client").$Enums.QType;
    averageTimeSpent: number;
    minTimeSpent: number;
    maxTimeSpent: number;
    medianTimeSpent: number;
    totalResponses: number;
}[]>;
/**
 * Get overall exam statistics
 */
export declare const getExamStatistics: (examId: string) => Promise<{
    exam: {
        id: string;
        title: string;
        durationMins: number;
        startAt: Date;
        endAt: Date;
    };
    totalAttempts: number;
    submittedAttempts: number;
    totalQuestions: number;
    averageScore: number;
    averagePercentage: number;
    highestScore: number;
    lowestScore: number;
    averageTimeSpent: number;
    completionRate: number;
}>;
/**
 * Get comprehensive analytics for an exam
 */
export declare const getExamAnalytics: (examId: string) => Promise<{
    statistics: {
        exam: {
            id: string;
            title: string;
            durationMins: number;
            startAt: Date;
            endAt: Date;
        };
        totalAttempts: number;
        submittedAttempts: number;
        totalQuestions: number;
        averageScore: number;
        averagePercentage: number;
        highestScore: number;
        lowestScore: number;
        averageTimeSpent: number;
        completionRate: number;
    };
    questionMetrics: {
        questionId: string;
        questionOrder: number;
        questionPrompt: string;
        questionType: import(".prisma/client").$Enums.QType;
        totalPoints: number;
        totalAttempts: number;
        averageScore: number;
        averagePercentage: number;
        passRate: number;
        averageTimeSpent: number;
        difficulty: number | null;
        discriminationIndex: number | null;
    }[];
    performanceTrends: {
        attemptNumber: number;
        studentId: string;
        studentName: string;
        studentRegNo: string | null;
        score: number;
        maxScore: number;
        percentage: number;
        submittedAt: Date | null;
    }[];
    timeAnalysis: {
        questionId: string;
        questionOrder: number;
        questionType: import(".prisma/client").$Enums.QType;
        averageTimeSpent: number;
        minTimeSpent: number;
        maxTimeSpent: number;
        medianTimeSpent: number;
        totalResponses: number;
    }[];
}>;
//# sourceMappingURL=analytics.service.d.ts.map