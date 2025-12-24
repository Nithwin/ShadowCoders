import { executeCodeLocally } from './local-executor';

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
export async function executeCode(request: CodeExecutionRequest): Promise<CodeExecutionResult> {
  const result = await executeCodeLocally(
    request.code,
    request.language,
    request.input,
    request.timeLimit || 5000
  );

  return {
    output: result.stdout,
    error: result.stderr || result.compileOutput || result.error || null,
    status: result.status,
    time: result.time,
    memory: result.memory,
  };
}
