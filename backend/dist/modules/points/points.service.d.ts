export declare const getUserPoints: (userId: string) => Promise<number>;
export declare const addPoints: (userId: string, points: number, description?: string, relatedId?: string, relatedType?: string) => Promise<number>;
export declare const getPointsHistory: (userId: string, page?: number, limit?: number, type?: string) => Promise<{
    history: {
        id: string;
        points: number;
        createdAt: Date;
        userId: string;
        balance: number;
        type: string;
        description: string | null;
        relatedId: string | null;
        relatedType: string | null;
    }[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}>;
export declare const awardPointsForExam: (userId: string, attemptId: string, score: number, maxScore: number, attemptNo?: number) => Promise<number>;
export declare const bulkAwardPointsForExam: (examId: string) => Promise<{
    awarded: number;
    skipped: number;
    errors: number;
}>;
//# sourceMappingURL=points.service.d.ts.map