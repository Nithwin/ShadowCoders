export declare const fetchLeetCodeStats: (username: string) => Promise<any>;
export declare const syncStudentStats: (userId?: string) => Promise<{
    total: number;
    success: number;
    failed: number;
    errors: string[];
}>;
export declare const getLeetCodeLeaderboard: () => Promise<{
    name: string | null;
    id: string;
    reg_no: string | null;
    leetcodeId: string | null;
    leetcodeStats: import("@prisma/client/runtime/library").JsonValue;
}[]>;
//# sourceMappingURL=leetcode.service.d.ts.map