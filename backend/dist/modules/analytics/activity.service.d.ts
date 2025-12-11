export interface ActivityData {
    date: string;
    count: number;
}
export declare const getUserActivityData: (userId: string, year?: number) => Promise<ActivityData[]>;
export declare const getUserStats: (userId: string) => Promise<{
    totalExams: number;
    averageScore: number;
    currentStreak: number;
    longestStreak: number;
    totalScore: number;
    totalMaxScore: number;
}>;
//# sourceMappingURL=activity.service.d.ts.map