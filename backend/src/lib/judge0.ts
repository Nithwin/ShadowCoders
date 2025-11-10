import axios from 'axios';
import { env } from '../config/env';

// Judge0 Language IDs
export const JUDGE0_LANGUAGES: Record<string, number> = {
  javascript: 63, // Node.js
  python: 71, // Python 3
  java: 62, // Java
  cpp: 54, // C++17
  c: 50, // C
  csharp: 51, // C#
  php: 68, // PHP
  ruby: 72, // Ruby
  go: 60, // Go
  rust: 73, // Rust
  swift: 83, // Swift
  kotlin: 78, // Kotlin
};

interface Judge0Submission {
  language_id: number;
  source_code: string;
  stdin?: string;
  expected_output?: string;
  cpu_time_limit?: number;
  memory_limit?: number;
}

interface Judge0Response {
  token: string;
  stdout?: string | null;
  stderr?: string | null;
  compile_output?: string | null;
  message?: string | null;
  status: {
    id: number;
    description: string;
  };
  time?: string;
  memory?: number;
}

/**
 * Execute code using Judge0 API (free tier)
 * Uses the public Judge0 CE API or RapidAPI if API key is provided
 */
export const executeCode = async (
  code: string,
  language: string,
  input?: string,
  expectedOutput?: string,
  timeoutMs: number = 2000
): Promise<Judge0Response> => {
  const languageId = JUDGE0_LANGUAGES[language.toLowerCase()];
  
  if (!languageId) {
    throw new Error(`Unsupported language: ${language}. Supported languages: ${Object.keys(JUDGE0_LANGUAGES).join(', ')}`);
  }

  const submission: Judge0Submission = {
    language_id: languageId,
    source_code: Buffer.from(code).toString('base64'),
    cpu_time_limit: Math.ceil(timeoutMs / 1000),
    memory_limit: 128000, // 128 MB
  };

  if (input) {
    submission.stdin = Buffer.from(input).toString('base64');
  }

  if (expectedOutput) {
    submission.expected_output = Buffer.from(expectedOutput).toString('base64');
  }

  try {
    // Determine if we're using RapidAPI or public/free API
    const isRapidAPI = env.JUDGE0_API_KEY && env.JUDGE0_API_URL?.includes('rapidapi.com');
    const isPublicAPI = !env.JUDGE0_API_KEY || env.JUDGE0_API_URL?.includes('ce.judge0.com');
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Add RapidAPI headers only if using RapidAPI
    if (isRapidAPI && env.JUDGE0_API_KEY) {
      headers['X-RapidAPI-Key'] = env.JUDGE0_API_KEY;
      headers['X-RapidAPI-Host'] = env.JUDGE0_RAPIDAPI_HOST || 'judge0-ce.p.rapidapi.com';
    }

    // Submit code for execution
    // For public API, we use wait=false and poll, for RapidAPI we can use wait=true
    const waitParam = isRapidAPI ? 'true' : 'false';
    const submitUrl = `${env.JUDGE0_API_URL}/submissions?base64_encoded=true&wait=${waitParam}&fields=stdout,stderr,status,time,memory,compile_output,message`;

    const submitResponse = await axios.post<any>(
      submitUrl,
      submission,
      { headers, timeout: 30000 } // 30 second timeout
    );

    // Get token from response
    let token: string;
    if (submitResponse.data.token) {
      token = submitResponse.data.token;
    } else if (typeof submitResponse.data === 'string') {
      token = submitResponse.data;
    } else {
      // Response might be the result directly (with wait=true)
      if (submitResponse.data.status) {
        // Result is already available
        const result = submitResponse.data;
        // Decode base64 responses
        if (result.stdout) {
          result.stdout = Buffer.from(result.stdout, 'base64').toString('utf-8');
        }
        if (result.stderr) {
          result.stderr = Buffer.from(result.stderr, 'base64').toString('utf-8');
        }
        if (result.compile_output) {
          result.compile_output = Buffer.from(result.compile_output, 'base64').toString('utf-8');
        }
        if (result.message) {
          result.message = Buffer.from(result.message, 'base64').toString('utf-8');
        }
        return result;
      }
      throw new Error('Unexpected response format from Judge0 API');
    }

    // Poll for result (necessary for public API, optional for RapidAPI with wait=false)
    let result: Judge0Response | null = null;
    let attempts = 0;
    const maxAttempts = 60; // Increased for public API which may be slower

    while (attempts < maxAttempts) {
      const resultUrl = `${env.JUDGE0_API_URL}/submissions/${token}?base64_encoded=true&fields=stdout,stderr,status,time,memory,compile_output,message`;

      const resultResponse = await axios.get<Judge0Response>(resultUrl, { headers });

      result = resultResponse.data;

      // Status IDs:
      // 1 = In Queue
      // 2 = Processing
      // 3 = Accepted
      // 4 = Wrong Answer
      // 5+ = Various errors
      if (result.status && result.status.id > 2) {
        break;
      }

      // Wait before polling again (longer wait for public API)
      await new Promise(resolve => setTimeout(resolve, isPublicAPI ? 1000 : 500));
      attempts++;
    }

    if (!result) {
      throw new Error('Code execution timed out');
    }

    // Decode base64 responses
    if (result.stdout) {
      result.stdout = Buffer.from(result.stdout, 'base64').toString('utf-8');
    }
    if (result.stderr) {
      result.stderr = Buffer.from(result.stderr, 'base64').toString('utf-8');
    }
    if (result.compile_output) {
      result.compile_output = Buffer.from(result.compile_output, 'base64').toString('utf-8');
    }
    if (result.message) {
      result.message = Buffer.from(result.message, 'base64').toString('utf-8');
    }

    return result;
  } catch (error: any) {
    console.error('Judge0 API Error:', error.response?.data || error.message);
    
    // Fallback: Return error response
    return {
      token: '',
      status: {
        id: 11, // Internal Error
        description: error.response?.data?.error || error.message || 'Code execution failed',
      },
      stderr: error.response?.data?.error || error.message || 'Failed to execute code',
    };
  }
};

/**
 * Test code against multiple test cases
 */
export const testCodeWithTestCases = async (
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
}> => {
  const results = await Promise.all(
    testCases.map(async (testCase) => {
      try {
        const response = await executeCode(
          code,
          language,
          testCase.input,
          testCase.expectedOutput,
          testCase.timeoutMs || 2000
        );

        const actualOutput = response.stdout?.trim() || null;
        const expectedOutputTrimmed = testCase.expectedOutput.trim();
        
        // Check if execution was successful
        const isAccepted = response.status.id === 3; // Accepted
        const isWrongAnswer = response.status.id === 4; // Wrong Answer
        
        let passed = false;
        if (isAccepted) {
          passed = true;
        } else if (isWrongAnswer && actualOutput) {
          // Compare outputs (normalize whitespace)
          passed = actualOutput.replace(/\s+/g, ' ') === expectedOutputTrimmed.replace(/\s+/g, ' ');
        }

        const errorMsg = response.stderr || response.compile_output || response.message;
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
};

