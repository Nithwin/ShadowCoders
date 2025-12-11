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
//# sourceMappingURL=points.repo.d.ts.map