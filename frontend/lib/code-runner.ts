// lib/code-runner.ts
import { api } from '@/lib/api';

export type ExecutionResult = {
  output: string | null;
  error: string | null;
  status: { id: number; description: string };
  time: number;
  memory: number;
};

/**
 * Execute code via Server-Side API
 * Replaces previous Client-Side (Pyodide) execution
 */
export async function runCode(
  code: string,
  language: string,
  input: string
): Promise<ExecutionResult> {
  try {
    const response = await api.post('/execution/run', {
      code,
      language,
      input
    });

    const result = response.data;

    return {
      output: result.stdout || null,
      error: result.stderr || result.compileOutput || result.error || null,
      status: result.status,
      time: result.time,
      memory: result.memory
    };
  } catch (err: any) {
    console.error("Server-side execution failed:", err);
    
    // Handle network or server errors
    const errorMessage = err.response?.data?.error?.message || err.message || "Execution failed";
    
    return {
      output: null,
      error: errorMessage,
      status: { id: 11, description: 'Runtime Error' }, // 11 is often generic/internal error
      time: 0,
      memory: 0
    };
  }
}

// Deprecated WorkerManager - kept empty to avoid breaking imports if any files reference it directly
// though they should be updated to not use it.
export const workerManager = {
  terminate: () => {} 
};
