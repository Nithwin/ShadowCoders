interface ExecutionResult {
    stdout: string | null;
    stderr: string | null;
    compileOutput: string | null;
    status: {
        id: number;
        description: string;
    };
    time: number;
    memory: number;
    error?: string;
}
/**
 * Execute code locally with proper sandboxing and resource limits
 */
export declare function executeCodeLocally(code: string, language: string, input?: string, timeoutMs?: number): Promise<ExecutionResult>;
/**
 * Test code against multiple test cases (local execution)
 * Optimized for compiled languages - compiles once, runs multiple times
 */
export declare function testCodeWithTestCasesLocally(code: string, language: string, testCases: Array<{
    input: string;
    expectedOutput: string;
    timeoutMs?: number;
    isHidden?: boolean;
    originalIndex?: number;
}>): Promise<{
    passed: number;
    total: number;
    results: Array<{
        input: string;
        expectedOutput: string;
        actualOutput: string | null;
        passed: boolean;
        error?: string;
        status: string;
        isHidden?: boolean;
        testCaseIndex?: number;
        errorType?: 'TLE' | 'Runtime Error' | 'Compilation Error' | 'Wrong Answer' | 'Accepted';
    }>;
}>;
export declare const SUPPORTED_LANGUAGES: string[];
export {};
//# sourceMappingURL=local-executor.d.ts.map