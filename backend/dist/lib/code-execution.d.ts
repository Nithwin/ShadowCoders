export interface CodeExecutionRequest {
    code: string;
    language: string;
    input?: string;
    timeLimit?: number;
    memoryLimit?: number;
}
export interface CodeExecutionResult {
    output: string | null;
    error: string | null;
    status: {
        id: number;
        description: string;
    };
    time: number;
    memory: number;
}
/**
 * Execute code and return simplified result
 */
export declare function executeCode(request: CodeExecutionRequest): Promise<CodeExecutionResult>;
//# sourceMappingURL=code-execution.d.ts.map