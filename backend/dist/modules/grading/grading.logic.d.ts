export declare const areArraysEqual: (arr1: any[], arr2: any[]) => boolean;
export declare const gradeMCQ: (answer: {
    chosenOptionIds?: string[];
} | null, correctOptionIds: string[], points: number) => {
    earnedPoints: number;
    verdict: string;
    gradingMode: "AUTO";
};
export declare const gradeCoding: (answer: {
    code?: string;
    language?: string;
} | null, testcases: Array<{
    input: string;
    expectedOutput: string;
    isHidden?: boolean;
    timeoutMs?: number;
}> | null, points: number) => Promise<{
    earnedPoints: number;
    verdict: string;
    gradingMode: "AUTO";
}>;
//# sourceMappingURL=grading.logic.d.ts.map