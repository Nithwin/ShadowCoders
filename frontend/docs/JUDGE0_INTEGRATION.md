# Judge0 Integration Guide

## Overview
Judge0 is used to execute and test student code submissions for coding questions. This document explains how the data flows from the frontend to Judge0 API.

## Data Flow

### 1. Frontend (Student Submits Code)
When a student clicks "Run Code" in the coding question interface:

```typescript
// Frontend: components/student/questions/CodingQuestion.tsx
const response = await api.post(`/student/attempts/${attemptId}/run-code`, {
  questionId,
  code,        // Student's code
  language,    // e.g., 'javascript', 'python', 'java'
});
```

### 2. Backend API Endpoint
The request hits the backend endpoint:

```typescript
// Backend: modules/grading/grading.controller.ts
POST /student/attempts/:attemptId/run-code
Body: {
  questionId: string,
  code: string,
  language: string
}
```

### 3. Grading Service
The grading service processes the request:

```typescript
// Backend: modules/grading/grading.service.ts
export const runCode = async (studentId, attemptId, input) => {
  // 1. Validate attempt and question
  // 2. Create/update response record
  // 3. Create grading job
  // 4. Execute code against test cases
  const testResults = await testCodeWithTestCases(code, language, visibleTestCases);
  // 5. Return results
}
```

### 4. Judge0 Integration
The `testCodeWithTestCases` function calls Judge0 for each test case:

```typescript
// Backend: lib/judge0.ts
export const executeCode = async (code, language, input, expectedOutput, timeoutMs) => {
  // 1. Map language to Judge0 language ID
  const languageId = JUDGE0_LANGUAGES[language.toLowerCase()];
  // e.g., 'javascript' -> 63, 'python' -> 71
  
  // 2. Prepare submission payload
  const submission = {
    language_id: languageId,
    source_code: Buffer.from(code).toString('base64'),  // Base64 encoded
    stdin: input ? Buffer.from(input).toString('base64') : undefined,
    expected_output: expectedOutput ? Buffer.from(expectedOutput).toString('base64') : undefined,
    cpu_time_limit: Math.ceil(timeoutMs / 1000),
    memory_limit: 128000,  // 128 MB
  };
  
  // 3. Submit to Judge0 API
  const submitUrl = `${JUDGE0_API_URL}/submissions?base64_encoded=true&wait=false`;
  const submitResponse = await axios.post(submitUrl, submission, { headers });
  
  // 4. Get token from response
  const token = submitResponse.data.token;
  
  // 5. Poll for result
  let result = null;
  while (attempts < maxAttempts) {
    const resultUrl = `${JUDGE0_API_URL}/submissions/${token}?base64_encoded=true`;
    const resultResponse = await axios.get(resultUrl, { headers });
    result = resultResponse.data;
    
    // Status IDs:
    // 1 = In Queue
    // 2 = Processing
    // 3 = Accepted
    // 4 = Wrong Answer
    // 5+ = Various errors
    if (result.status.id > 2) {
      break;  // Execution completed
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));  // Wait 1 second
    attempts++;
  }
  
  // 6. Decode base64 responses
  if (result.stdout) {
    result.stdout = Buffer.from(result.stdout, 'base64').toString('utf-8');
  }
  if (result.stderr) {
    result.stderr = Buffer.from(result.stderr, 'base64').toString('utf-8');
  }
  
  // 7. Return result
  return result;
}
```

### 5. Test Case Execution
For each test case, the code is executed:

```typescript
// Backend: lib/judge0.ts
export const testCodeWithTestCases = async (code, language, testCases) => {
  const results = await Promise.all(
    testCases.map(async (testCase) => {
      const response = await executeCode(
        code,
        language,
        testCase.input,           // Test case input
        testCase.expectedOutput,   // Expected output
        testCase.timeoutMs || 2000
      );
      
      const actualOutput = response.stdout?.trim() || null;
      const expectedOutputTrimmed = testCase.expectedOutput.trim();
      
      // Compare outputs
      const isAccepted = response.status.id === 3;  // Accepted status
      let passed = false;
      
      if (isAccepted) {
        passed = true;
      } else if (response.status.id === 4 && actualOutput) {
        // Wrong Answer - compare outputs (normalize whitespace)
        passed = actualOutput.replace(/\s+/g, ' ') === expectedOutputTrimmed.replace(/\s+/g, ' ');
      }
      
      return {
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput,
        passed,
        error: response.stderr || response.compile_output || response.message,
        status: response.status.description,
      };
    })
  );
  
  const passed = results.filter((r) => r.passed).length;
  
  return {
    passed,
    total: testCases.length,
    results,
  };
}
```

### 6. Response to Frontend
The test results are returned to the frontend:

```typescript
// Response structure
{
  passed: number,        // Number of test cases passed
  total: number,         // Total number of test cases
  testResults: [
    {
      input: string,
      expectedOutput: string,
      actualOutput: string | null,
      passed: boolean,
      error?: string,
      status: string,
    }
  ],
  message: string,       // e.g., "All test cases passed!" or "2/5 test cases passed"
}
```

## Judge0 API Configuration

### Environment Variables
```env
JUDGE0_API_URL=https://ce.judge0.com  # Public API (free tier)
# OR
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com  # RapidAPI
JUDGE0_API_KEY=your_api_key_here  # Required for RapidAPI
JUDGE0_RAPIDAPI_HOST=judge0-ce.p.rapidapi.com  # Required for RapidAPI
```

### Supported Languages
```typescript
const JUDGE0_LANGUAGES = {
  javascript: 63,  // Node.js
  python: 71,      // Python 3
  java: 62,        // Java
  cpp: 54,         // C++17
  c: 50,           // C
  csharp: 51,      // C#
  php: 68,         // PHP
  ruby: 72,        // Ruby
  go: 60,          // Go
  rust: 73,        // Rust
  swift: 83,       // Swift
  kotlin: 78,      // Kotlin
};
```

## Test Case Format

### Input Format (stdin)
Test cases use standard input/output (stdin/stdout):
- Single integer: `"5"`
- Multiple integers on one line: `"5 10 15"`
- Multiple lines: `"5\n10\n20"` (use `\n` for newline in JSON)
- Array of numbers: `"1 2 3 4 5"`
- String: `"hello world"`

### Output Format (stdout)
Expected outputs match what the program prints:
- Single value: `"15"`
- Multiple lines: `"15\n20"`
- Array output: `"1 2 3"` or `"[1,2,3]"`
- String output: `"hello world"`

### Example Test Case
```json
{
  "input": "5\n10",
  "expectedOutput": "15",
  "isHidden": false,
  "timeoutMs": 2000
}
```

## Security Considerations

1. **Timeout Limits**: Each test case has a timeout (default 2000ms) to prevent infinite loops
2. **Memory Limits**: Code execution is limited to 128 MB of memory
3. **Hidden Test Cases**: Students only see visible test cases; hidden test cases are used for final grading
4. **Rate Limiting**: Judge0 public API has rate limits; consider using RapidAPI for production

## Error Handling

### Common Errors
- **Compilation Error**: Code fails to compile (check `compile_output`)
- **Runtime Error**: Code crashes during execution (check `stderr`)
- **Time Limit Exceeded**: Code takes too long to execute
- **Memory Limit Exceeded**: Code uses too much memory
- **Wrong Answer**: Code produces incorrect output

### Error Response Format
```typescript
{
  status: {
    id: number,           // Error status ID
    description: string,  // Error description
  },
  stderr?: string,       // Error message
  compile_output?: string, // Compilation errors
  message?: string,      // Additional error message
}
```

## Testing

To test the Judge0 integration:

1. Create a coding question with test cases
2. Start an exam attempt
3. Write code in the coding question
4. Click "Run Code"
5. Check the test results in the output panel

## Troubleshooting

### Code Not Executing
- Check if Judge0 API URL is correct
- Verify API key (if using RapidAPI)
- Check network connectivity
- Review Judge0 API status

### Test Cases Not Passing
- Verify input/output format matches expected format
- Check for whitespace differences
- Ensure code handles all edge cases
- Review test case definitions in the database

### Timeout Issues
- Increase `timeoutMs` for test cases
- Optimize student code
- Check Judge0 API response times

