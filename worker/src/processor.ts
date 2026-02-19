import { executeInDocker } from './docker-executor';

/**
 * Job data shape matching CodeExecutionJobData from the API
 */
interface CodeExecutionJobData {
  jobId: string;
  responseId: string;
  code: string;
  language: string;
  testCases?: Array<{
    input: string;
    expectedOutput: string;
    timeoutMs?: number;
    isHidden?: boolean;
    originalIndex?: number;
  }>;
  customInput?: string;
  runAllTests?: boolean;
  timeoutMs?: number;
  maxPoints?: number;
}

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

interface TestCaseResult {
  input: string;
  expectedOutput: string;
  actualOutput: string | null;
  passed: boolean;
  error?: string;
  status: string;
  isHidden?: boolean;
  testCaseIndex?: number;
  errorType?: 'TLE' | 'Runtime Error' | 'Compilation Error' | 'Wrong Answer' | 'Accepted';
}

/**
 * Process a code execution job.
 * This is the main entry point called by the BullMQ worker.
 */
export async function processCodeExecution(data: CodeExecutionJobData): Promise<any> {
  const { code, language, testCases, customInput, runAllTests, timeoutMs } = data;

  // If there are test cases, run all of them
  if (testCases && testCases.length > 0 && runAllTests) {
    return await runTestCases(code, language, testCases, data.maxPoints);
  }

  // Single execution (custom input or just run)
  const input = customInput || '';
  const result = await executeInDocker(code, language, input, timeoutMs || 10000);
  return result;
}

/**
 * Run code against multiple test cases.
 * For compiled languages, compiles once then runs each test case.
 */
async function runTestCases(
  code: string,
  language: string,
  testCases: Array<{ input: string; expectedOutput: string; timeoutMs?: number; isHidden?: boolean; originalIndex?: number }>,
  maxPoints?: number
): Promise<{
  passed: number;
  total: number;
  results: TestCaseResult[];
  score?: number;
  maxScore?: number;
}> {
  const results: TestCaseResult[] = [];

  // For compiled languages, compile first
  const compiledLanguages = ['c', 'cpp', 'java'];
  let compileResult: ExecutionResult | null = null;
  
  if (compiledLanguages.includes(language.toLowerCase())) {
    compileResult = await executeInDocker(code, language, '', 10000, true);
    if (compileResult && compileResult.status.id === 6) {
      // Compilation error — return failure for all test cases
      return {
        passed: 0,
        total: testCases.length,
        results: testCases.map((tc, idx) => ({
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          actualOutput: null,
          passed: false,
          error: compileResult!.compileOutput || compileResult!.error || 'Compilation failed',
          status: 'Compilation Error',
          testCaseIndex: tc.originalIndex !== undefined ? tc.originalIndex : idx,
          errorType: 'Compilation Error' as const,
          ...(tc.isHidden !== undefined ? { isHidden: tc.isHidden } : {}),
        })),
      };
    }
  }

  // Run each test case sequentially
  for (let idx = 0; idx < testCases.length; idx++) {
    const testCase = testCases[idx];
    if (!testCase) continue;

    try {
      const result = await executeInDocker(
        code,
        language,
        testCase.input || '',
        testCase.timeoutMs || 5000
      );

      const actualOutput = result.stdout?.trim() || null;
      const expectedOutputTrimmed = testCase.expectedOutput.trim();

      let errorType: TestCaseResult['errorType'] = 'Accepted';
      let passed = false;
      let status = 'Accepted';

      if (result.status.id === 5) {
        status = 'Time Limit Exceeded';
        errorType = 'TLE';
      } else if (result.status.id === 6) {
        status = 'Compilation Error';
        errorType = 'Compilation Error';
      } else if (result.status.id === 7 || result.stderr || result.error) {
        status = 'Runtime Error';
        errorType = 'Runtime Error';
      } else if (actualOutput !== null) {
        // Normalize for comparison
        const normalizedActual = actualOutput.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
          .split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0).join('\n');
        const normalizedExpected = expectedOutputTrimmed.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
          .split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0).join('\n');

        const singleActual = actualOutput.replace(/\s+/g, ' ').trim();
        const singleExpected = expectedOutputTrimmed.replace(/\s+/g, ' ').trim();

        passed = normalizedActual === normalizedExpected || singleActual === singleExpected;

        if (!passed) {
          errorType = 'Wrong Answer';
          status = 'Wrong Answer';
        }
      } else {
        errorType = 'Wrong Answer';
        status = 'Wrong Answer';
      }

      const tcResult: TestCaseResult = {
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput,
        passed,
        status,
        testCaseIndex: testCase.originalIndex !== undefined ? testCase.originalIndex : idx,
        errorType,
      };

      if (testCase.isHidden !== undefined) {
        tcResult.isHidden = testCase.isHidden;
      }

      const errorMsg = result.stderr || result.compileOutput || result.error;
      if (errorMsg) {
        tcResult.error = errorMsg;
      }

      results.push(tcResult);
    } catch (error: any) {
      results.push({
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: null,
        passed: false,
        error: error.message || 'Execution failed',
        status: 'Error',
        testCaseIndex: testCase.originalIndex !== undefined ? testCase.originalIndex : idx,
        errorType: 'Runtime Error',
        ...(testCase.isHidden !== undefined ? { isHidden: testCase.isHidden } : {}),
      });
    }
  }

  const passed = results.filter(r => r.passed).length;

  // Calculate score if maxPoints provided
  let score: number | undefined;
  let maxScore: number | undefined;
  if (maxPoints) {
    maxScore = maxPoints;
    score = testCases.length > 0 ? (passed / testCases.length) * maxPoints : 0;
  }

  return {
    passed,
    total: testCases.length,
    results,
    ...(score !== undefined ? { score } : {}),
    ...(maxScore !== undefined ? { maxScore } : {}),
  };
}
