import { GradingJob, Prisma } from '@prisma/client';
import { executeCodeLocally, testCodeWithTestCasesLocally } from '../../lib/local-executor';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { QType } from '@prisma/client';

/**
 * Processor for 'local' provider jobs (Code Execution)
 */
export const executeCodeJob = async (job: GradingJob) => {
  const payload = job.payload as any;
  if (!payload) throw new Error('Missing payload');

  const { code, language, customInput } = payload;
  
  // Is this a simple run or a test case run?
  // We need to look at the Question associated with the response to know what test cases to run
  // But wait! The payload usually has everything needed or we fetch it.
  // In `grading.service.ts` original logic, we fetched the Question.
  
  // Let's refetch necessary context
  const response = await prisma.response.findUnique({
    where: { id: job.responseId },
    include: { question: true }
  });

  if (!response) throw new Error('Response not found');

  if (customInput) {
    // Custom Input Execution
    const executionResult = await executeCodeLocally(code, language, customInput, 10000);
    const isSuccess = executionResult.status.id === 3;
    
    return {
      passed: isSuccess ? 1 : 0,
      total: 1,
      testResults: [
        {
          input: customInput,
          expectedOutput: '(Custom Input)',
          actualOutput: executionResult.stdout || '',
          passed: isSuccess,
          status: executionResult.status.description,
          error: executionResult.stderr || ('compile_output' in executionResult ? executionResult.compile_output : null) || null,
          time: typeof executionResult.time === 'string' ? parseFloat(executionResult.time) : executionResult.time,
          memory: executionResult.memory || 0,
        }
      ],
      message: 'Custom input execution completed',
      customOutput: {
        input: customInput,
        output: executionResult.stdout || '',
        error: executionResult.stderr || null,
        status: executionResult.status.description,
        time: typeof executionResult.time === 'string' ? parseFloat(executionResult.time) : executionResult.time,
        memory: executionResult.memory || 0,
      },
    };
  } else {
    // Test Case Execution
    const question = response.question;
    const testCases = question.testcases as Array<{
      input: string;
      expectedOutput: string;
      isHidden?: boolean;
      timeoutMs?: number;
    }>;

    if (!testCases || testCases.length === 0) {
      throw new Error('No test cases found');
    }

    // Determine which tests to run (Payload *might* specify runAllTests, but let's assume all visible + hidden for grading)
    // Actually, usually we run ALL tests for grading.
    
    const testsWithMetadata = testCases.map((tc, idx) => ({
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      timeoutMs: tc.timeoutMs || 10000,
      isHidden: tc.isHidden || false,
      originalIndex: idx,
    }));

    const testResults = await testCodeWithTestCasesLocally(code, language, testsWithMetadata);

    // Save score to DB immediately (Side Effect of Processor)
    // Calculate Score
    const questionPoints = Number(question.points) || 0;
    const passedRatio = testResults.total > 0 ? (testResults.passed / testResults.total) : 0;
    const earnedPoints = parseFloat((passedRatio * questionPoints).toFixed(2));
    
    let verdict = 'FAIL';
    if (testResults.passed === testResults.total && testResults.total > 0) {
      verdict = 'PASS';
    } else if (testResults.passed > 0) {
      verdict = 'PARTIAL';
    }

    await prisma.response.update({
      where: { id: response.id },
      data: {
        earnedPoints: earnedPoints,
        verdict: verdict,
        gradingMode: 'AUTO',
      },
    });

    return {
      passed: testResults.passed,
      total: testResults.total,
      testResults: testResults.results,
      message: testResults.passed === testResults.total
        ? 'All test cases passed!'
        : `${testResults.passed}/${testResults.total} test cases passed`,
      customOutput: null,
    };
  }
};


/**
 * Processor for 'gemini'/'ollama' provider jobs (Essay Grading)
 */
export const executeAiGradingJob = async (job: GradingJob) => {
  const { responseId } = job.payload as any;
  
  const response = await prisma.response.findUnique({
    where: { id: responseId },
    include: {
      question: {
        include: { rubric: true }
      }
    }
  });

  if (!response) throw new Error('Response not found');

  // Prepare Prompt
  const studentText = response.textAnswer || (response.answer as any)?.textAnswer || (response.answer as any)?.text;
  if (!studentText) throw new Error('Essay is empty');

  const questionPrompt = response.question.prompt || 'No prompt provided';
  const maxPoints = response.question.points ? parseFloat(String(response.question.points)) : 0;
  const rubricText = response.question.rubric 
    ? JSON.stringify(response.question.rubric.criteria) 
    : 'No specific rubric provided. Grade based on clarity, relevance, and completeness.';

  const systemPrompt = `You are a strict academic grader. 
Grade the following essay based on the provided Question and Rubric.

**Question:**
${questionPrompt}

**Rubric/Criteria:**
${rubricText}

**Max Points:** ${maxPoints}

**Student Answer:**
${studentText}

**INSTRUCTIONS:**
1. Analyze the student's answer against the rubric.
2. Assign a score between 0 and ${maxPoints}. Use decimal points if needed (e.g., 8.5).
3. Provide constructive feedback explaining the score.
4. Return ONLY a valid JSON object in this format:
{
  "score": <number>,
  "feedback": "<string>"
}
`;

  // Call AI Service
  let aiResponseString = '';
  if (job.provider === 'ollama') {
    const { generateJsonFromOllama } = await import('../../lib/ollama');
    aiResponseString = await generateJsonFromOllama(systemPrompt);
  } else {
    const { generateJsonFromAi } = await import('../../lib/gemini');
    aiResponseString = await generateJsonFromAi(systemPrompt);
  }

  // Parse Result
  let cleaned = aiResponseString.trim();
  if (cleaned.startsWith('```')) {
    const lines = cleaned.split('\n');
    lines.shift();
    if (lines[lines.length - 1]?.trim() === '```') lines.pop();
    cleaned = lines.join('\n');
  }
  
  const resultJson = JSON.parse(cleaned);
      
  // Validate result structure
  if (typeof resultJson.score !== 'number' || typeof resultJson.feedback !== 'string') {
    throw new Error('AI returned invalid JSON structure');
  }

  // Save Evaluation (Side Effect)
  await prisma.evaluation.create({
    data: {
      responseId: response.id,
      kind: 'AI',
      score: resultJson.score,
      comments: resultJson.feedback,
      isFinal: false,
      createdAt: new Date(),
    }
  });

  return resultJson;
};
