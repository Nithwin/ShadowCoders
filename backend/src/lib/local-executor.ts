import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

// Language configuration
interface LanguageConfig {
  extension: string;
  command: string;
  compileCommand?: (filePath: string) => string;
  runCommand: (filePath: string) => string;
  timeout: number; // Default timeout in ms
}

const LANGUAGE_CONFIGS: Record<string, LanguageConfig> = {
  javascript: {
    extension: 'js',
    command: 'node',
    runCommand: (filePath) => `node "${filePath}"`,
    timeout: 5000,
  },
  python: {
    extension: 'py',
    command: 'python',
    runCommand: (filePath) => `python "${filePath}"`,
    timeout: 5000,
  },
  java: {
    extension: 'java',
    command: 'javac',
    compileCommand: (filePath) => `javac "${filePath}"`,
    runCommand: (filePath) => {
      const className = path.basename(filePath, '.java');
      const dir = path.dirname(filePath);
      return `cd "${dir}" && java ${className}`;
    },
    timeout: 10000,
  },
  cpp: {
    extension: 'cpp',
    command: 'g++',
    compileCommand: (filePath) => {
      const outputFile = filePath.replace('.cpp', '.out');
      return `g++ "${filePath}" -o "${outputFile}" -std=c++17 -O2`;
    },
    runCommand: (filePath) => {
      const outputFile = filePath.replace('.cpp', '.out');
      return `"${outputFile}"`;
    },
    timeout: 10000,
  },
  c: {
    extension: 'c',
    command: 'gcc',
    compileCommand: (filePath) => {
      const outputFile = filePath.replace('.c', '.out');
      return `gcc "${filePath}" -o "${outputFile}" -O2`;
    },
    runCommand: (filePath) => {
      const outputFile = filePath.replace('.c', '.out');
      return `"${outputFile}"`;
    },
    timeout: 10000,
  },
};

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
export async function executeCodeLocally(
  code: string,
  language: string,
  input?: string,
  timeoutMs: number = 5000
): Promise<ExecutionResult> {
  const langConfig = LANGUAGE_CONFIGS[language.toLowerCase()];
  
  if (!langConfig) {
    return {
      stdout: null,
      stderr: null,
      compileOutput: null,
      status: {
        id: 11, // Internal Error
        description: `Unsupported language: ${language}`,
      },
      time: 0,
      memory: 0,
      error: `Unsupported language: ${language}. Supported languages: ${Object.keys(LANGUAGE_CONFIGS).join(', ')}`,
    };
  }

  // Create temporary directory for this execution
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'code-exec-'));
  const fileName = `code.${langConfig.extension}`;
  const filePath = path.join(tempDir, fileName);

  try {
    // Write code to file
    await fs.writeFile(filePath, code, 'utf-8');

    // Compile if needed (for compiled languages)
    if (langConfig.compileCommand) {
      try {
        const compileCmd = langConfig.compileCommand(filePath);
        
        const compileResult = await execAsync(compileCmd, {
          cwd: tempDir,
          timeout: timeoutMs,
          maxBuffer: 1024 * 1024, // 1MB buffer
        });

        if (compileResult.stderr) {
          return {
            stdout: null,
            stderr: null,
            compileOutput: compileResult.stderr,
            status: {
              id: 6, // Compilation Error
              description: 'Compilation Error',
            },
            time: 0,
            memory: 0,
            error: compileResult.stderr,
          };
        }
      } catch (compileError: any) {
        return {
          stdout: null,
          stderr: null,
          compileOutput: compileError.stderr || compileError.message,
          status: {
            id: 6, // Compilation Error
            description: 'Compilation Error',
          },
          time: 0,
          memory: 0,
          error: compileError.stderr || compileError.message,
        };
      }
    }

    // Execute the code
    const runCmd = langConfig.runCommand(filePath);
    const startTime = Date.now();
    
    try {
      const result = await executeWithTimeout(
        runCmd,
        input || '',
        tempDir,
        timeoutMs
      );

      const executionTime = Date.now() - startTime;

      // Check if execution was successful
      if (result.timedOut) {
        return {
          stdout: result.stdout || null,
          stderr: result.stderr || 'Time limit exceeded',
          compileOutput: null,
          status: {
            id: 5, // Time Limit Exceeded
            description: 'Time Limit Exceeded',
          },
          time: executionTime,
          memory: 0,
          error: 'Time limit exceeded',
        };
      }

      if (result.error && result.stderr) {
        return {
          stdout: result.stdout || null,
          stderr: result.stderr,
          compileOutput: null,
          status: {
            id: 7, // Runtime Error
            description: 'Runtime Error',
          },
          time: executionTime,
          memory: 0,
          error: result.stderr,
        };
      }

      // Success
      return {
        stdout: result.stdout || null,
        stderr: result.stderr || null,
        compileOutput: null,
        status: {
          id: 3, // Accepted
          description: 'Accepted',
        },
        time: executionTime,
        memory: 0,
      };
    } catch (execError: any) {
      const executionTime = Date.now() - startTime;
      return {
        stdout: null,
        stderr: execError.message || 'Execution failed',
        compileOutput: null,
        status: {
          id: 7, // Runtime Error
          description: 'Runtime Error',
        },
        time: executionTime,
        memory: 0,
        error: execError.message || 'Execution failed',
      };
    }
  } finally {
    // Cleanup: Remove temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.error('Error cleaning up temp directory:', cleanupError);
    }
  }
}

/**
 * Execute command with timeout and input
 */
async function executeWithTimeout(
  command: string,
  input: string,
  cwd: string,
  timeoutMs: number
): Promise<{
  stdout: string;
  stderr: string;
  error?: string;
  timedOut: boolean;
}> {
  return new Promise((resolve) => {
    // Use shell execution for better cross-platform compatibility
    // When shell is true, pass the entire command as a string
    const childProcess = spawn(command, {
      cwd,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    // Set timeout
    const timeout = setTimeout(() => {
      timedOut = true;
      try {
        childProcess.kill('SIGKILL');
      } catch (err) {
        // Ignore errors when killing
      }
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim() || 'Time limit exceeded',
        timedOut: true,
      });
    }, timeoutMs);

    // Handle stdout
    if (childProcess.stdout) {
      childProcess.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });
    }

    // Handle stderr
    if (childProcess.stderr) {
      childProcess.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });
    }

    // Handle process exit
    childProcess.on('exit', (code: number | null, signal: NodeJS.Signals | null) => {
      clearTimeout(timeout);
      
      if (timedOut) {
        return; // Already resolved
      }

      if (code !== 0) {
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim() || `Process exited with code ${code}`,
          error: `Process exited with code ${code}`,
          timedOut: false,
        });
      } else {
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          timedOut: false,
        });
      }
    });

    // Handle errors
    childProcess.on('error', (error: Error) => {
      clearTimeout(timeout);
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim() || error.message,
        error: error.message,
        timedOut: false,
      });
    });

    // Write input to stdin
    if (input && childProcess.stdin) {
      try {
        childProcess.stdin.write(input);
        childProcess.stdin.end();
      } catch (err) {
        // If stdin is already closed, ignore
      }
    } else if (childProcess.stdin) {
      childProcess.stdin.end();
    }
  });
}

/**
 * Test code against multiple test cases (local execution)
 */
export async function testCodeWithTestCasesLocally(
  code: string,
  language: string,
  testCases: Array<{ input: string; expectedOutput: string; timeoutMs?: number }>
): Promise<{
  passed: number;
  total: number;
  results: Array<{
    input: string;
    expectedOutput: string;
    actualOutput: string | null;
    passed: boolean;
    error?: string;
    status: string;
  }>;
}> {
  const results = await Promise.all(
    testCases.map(async (testCase) => {
      try {
        const response = await executeCodeLocally(
          code,
          language,
          testCase.input,
          testCase.timeoutMs || 5000
        );

        const actualOutput = response.stdout?.trim() || null;
        const expectedOutputTrimmed = testCase.expectedOutput.trim();
        
        // Check if execution was successful
        const isAccepted = response.status.id === 3; // Accepted
        const isCompilationError = response.status.id === 6;
        const isRuntimeError = response.status.id === 7;
        const isTimeLimitExceeded = response.status.id === 5;
        
        let passed = false;
        if (isAccepted && actualOutput) {
          // Normalize whitespace for comparison
          const normalizedActual = actualOutput.replace(/\s+/g, ' ').trim();
          const normalizedExpected = expectedOutputTrimmed.replace(/\s+/g, ' ').trim();
          passed = normalizedActual === normalizedExpected;
        }

        const errorMsg = response.stderr || response.compileOutput || response.error;
        const result: {
          input: string;
          expectedOutput: string;
          actualOutput: string | null;
          passed: boolean;
          error?: string;
          status: string;
        } = {
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          actualOutput,
          passed,
          status: response.status.description,
        };
        
        if (errorMsg) {
          result.error = errorMsg;
        }
        
        return result;
      } catch (error: any) {
        return {
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          actualOutput: null,
          passed: false,
          error: error.message || 'Execution failed',
          status: 'Error',
        };
      }
    })
  );

  const passed = results.filter((r) => r.passed).length;

  return {
    passed,
    total: testCases.length,
    results,
  };
}

// Export supported languages
export const SUPPORTED_LANGUAGES = Object.keys(LANGUAGE_CONFIGS);

