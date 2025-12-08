import { z } from 'zod';
import { runCodeSchema } from './grading.zod';
import * as gradingRepo from './grading.repo';
import { prisma } from '../../lib/prisma';
import { AttemptStatus, QType, Prisma } from '@prisma/client';
import { testCodeWithTestCasesLocally, executeCodeLocally } from '../../lib/local-executor';
import { env } from '../../config/env';
import { executionQueue } from '../../lib/execution-queue';

// Infer the TypeScript type from the Zod schema's body
type RunCodeInput = z.infer<typeof runCodeSchema>['body'];

/**
 * Handles the logic for running a student's code submission.
 */
export const runCode = async (
  studentId: string,
  attemptId: string,
  input: RunCodeInput
) => {
  const { questionId, code, language, customInput, runAllTests } = input;

  // 1. --- Validation: Check Attempt ---
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    select: { studentId: true, status: true, examId: true },
  });

  if (!attempt) {
    throw { status: 404, message: 'Attempt not found' };
  }
  if (attempt.studentId !== studentId) {
    throw { status: 403, message: 'Forbidden: You do not have access to this attempt' };
  }
  // Allow students to run code even after submission
  // We allow running code for both IN_PROGRESS and SUBMITTED status

  // 2. --- Validation: Check Question ---
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { examId: true, type: true, testcases: true },
  });

  if (!question) {
    throw { status: 404, message: 'Question not found' };
  }
  if (question.examId !== attempt.examId) {
    throw { status: 403, message: 'Question is not part of this exam' };
  }
  if (question.type !== QType.CODING) {
    throw { status: 400, message: 'This is not a coding question' };
  }
  
  // 3. --- Upsert Response (create if doesn't exist) ---
  // This allows students to test code before final submission
  let response = await prisma.response.findFirst({
    where: { attemptId: attemptId, questionId: questionId },
    select: { id: true }
  });

  if (!response) {
    // Create a response record if it doesn't exist
    const newResponse = await prisma.response.create({
      data: {
        attemptId: attemptId,
        questionId: questionId,
        type: QType.CODING,
        answer: { code, language },
      },
      select: { id: true }
    });
    response = newResponse;
  } else {
    // Update the existing response with the latest code
    await prisma.response.update({
      where: { id: response.id },
      data: {
        answer: { code, language },
      },
    });
  }

  // 4. --- Create Grading Job ---
  const jobData: Prisma.GradingJobCreateInput = {
    provider: 'local',
    status: 'QUEUED',
    payload: { code, language, customInput: customInput || null },
    response: { connect: { id: response.id } },
  };
  const job = await gradingRepo.createGradingJob(jobData);

  // 5. --- Execute Code (via Queue) ---
  let result: any;

  if (customInput !== undefined && customInput !== null && customInput !== '') {
    // Run with custom input (single execution) - queued
    const executionResult = await executionQueue.enqueue(async () => {
      return await executeCodeLocally(code, language, customInput, 5000);
    });

    // Format result for custom input
    result = {
      passed: 0,
      total: 0,
      testResults: [],
      message: 'Custom input execution',
      customOutput: {
        input: customInput,
        output: executionResult.stdout || '',
        error: executionResult.stderr || ('compile_output' in executionResult ? executionResult.compile_output : null) || ('message' in executionResult ? executionResult.message : null) || ('error' in executionResult ? (executionResult as any).error : null) || null,
        status: executionResult.status.description,
        time: typeof executionResult.time === 'string' ? parseFloat(executionResult.time) : executionResult.time,
        memory: executionResult.memory || 0,
      },
    };
  } else {
    // Run against visible test cases
    if (!question.testcases || (question.testcases as any[]).length === 0) {
      throw { status: 400, message: 'No test cases found for this question' };
    }

    const testCases = question.testcases as Array<{
      input: string;
      expectedOutput: string;
      isHidden?: boolean;
      timeoutMs?: number;
    }>;

    // Filter test cases: if runAllTests is true, use all test cases; otherwise only visible ones
    const testCasesToRun = runAllTests 
      ? testCases 
      : testCases.filter((tc) => !tc.isHidden);

    if (testCasesToRun.length === 0) {
      const errorMessage = runAllTests 
        ? 'No test cases found for this question'
        : 'No visible test cases found for this question';
      throw { status: 400, message: errorMessage };
    }

    // Test code against test cases using local executor - queued
    const testResults = await executionQueue.enqueue(async () => {
      return await testCodeWithTestCasesLocally(
        code,
        language,
        testCasesToRun.map((tc) => ({
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          timeoutMs: tc.timeoutMs || 5000, // Default 5 seconds for local execution
        }))
      );
    });

    // Format Result
    result = {
      passed: testResults.passed,
      total: testResults.total,
      testResults: testResults.results,
      message: testResults.passed === testResults.total
        ? 'All test cases passed!'
        : `${testResults.passed}/${testResults.total} test cases passed`,
      customOutput: null,
    };
  }

  // 6. --- Update Job with Result ---
  const jobStatus = result.customOutput 
    ? (result.customOutput.error ? 'FAILED' : 'SUCCEEDED')
    : (result.passed === result.total ? 'SUCCEEDED' : 'FAILED');
  
  const finalJob = await gradingRepo.updateGradingJob(
    job.id,
    jobStatus,
    result
  );

  // 7. Return the execution result
  return finalJob.result;
};

// --- ESSAY GRADING LOGIC ---

// Create a dedicated queue with concurrency 1 for essay grading to save CPU
// This ensures only ONE essay is graded at a time by the local LLM
import { ExecutionQueue } from '../../lib/execution-queue';
const essayGradingQueue = new ExecutionQueue(1);

export const gradeEssay = async (responseId: string) => {
  // 1. Validation
  const response = await prisma.response.findUnique({
    where: { id: responseId },
    include: {
      question: {
        include: { rubric: true }
      }
    }
  });

  if (!response) {
    throw { status: 404, message: 'Response not found' };
  }
  if (response.question.type !== QType.ESSAY) {
    throw { status: 400, message: 'This is not an essay response' };
  }
  
  // 2. Extact text answer
  // Handle both possible locations for essay text (answer JSON or textAnswer field)
  let studentText = response.textAnswer;
  if (!studentText && response.answer && typeof response.answer === 'object') {
    studentText = (response.answer as any).textAnswer || (response.answer as any).text;
  }

  if (!studentText || studentText.trim().length === 0) {
    throw { status: 400, message: 'Essay is empty, cannot grade.' };
  }

  // 3. Create GradingJob (Queued)
  const jobData: Prisma.GradingJobCreateInput = {
    provider: env.AI_PROVIDER || 'gemini',
    status: 'QUEUED',
    payload: { responseId },
    response: { connect: { id: response.id } },
  };
  const job = await gradingRepo.createGradingJob(jobData);

  // 4. Enqueue the grading task
  essayGradingQueue.enqueue(async () => {
    try {
      console.log(`[EssayGrade] Starting job ${job.id} for response ${response.id}`);
      
      // Update job to RUNNING
      await gradingRepo.updateGradingJob(job.id, 'RUNNING', null);

      // Prepare Prompt
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
      if (env.AI_PROVIDER === 'ollama') {
        const { generateJsonFromOllama } = await import('../../lib/ollama');
        aiResponseString = await generateJsonFromOllama(systemPrompt);
      } else {
        const { generateJsonFromAi } = await import('../../lib/gemini');
        aiResponseString = await generateJsonFromAi(systemPrompt);
      }

      // Parse Result
      // Clean up markdown code blocks if present
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

      // 5. Save Evaluation
      await prisma.evaluation.create({
        data: {
          responseId: response.id,
          kind: 'AI',
          score: resultJson.score,
          comments: resultJson.feedback,
          isFinal: false, // Teacher must approve
          createdAt: new Date(),
        }
      });

      // 6. Complete Job
      await gradingRepo.updateGradingJob(job.id, 'SUCCEEDED', resultJson);
      console.log(`[EssayGrade] Job ${job.id} completed. Score: ${resultJson.score}`);
      
      return resultJson;

    } catch (error: any) {
      console.error(`[EssayGrade] Job ${job.id} failed:`, error);
      await gradingRepo.updateGradingJob(job.id, 'FAILED', { error: error.message });
      throw error;
    }
  });

  return { jobId: job.id, status: 'QUEUED', message: 'Essay grading has been queued.' };
};

export const overrideResponseGrade = async (
    responseId: string,
    score: number,
    feedback?: string
) => {
    // 1. Check if response exists
    const response = await prisma.response.findUnique({
        where: { id: responseId },
        include: { question: true }
    });

    if (!response) {
        throw { status: 404, message: 'Response not found' };
    }

    // 2. Update the response
    const updatedResponse = await prisma.response.update({
        where: { id: responseId },
        data: {
            earnedPoints: score,
            verdict: score === 0 ? 'FAIL' : (score >= (response.question.points ? parseFloat(String(response.question.points)) : 0) ? 'PASS' : 'PARTIAL'),
            feedback: feedback || 'Manual grade override by administrator',
            gradingMode: 'MANUAL'
        }
    });

    // 3. Recalculate attempt score
    // We need to re-sum all response/earnedPoints for the attempt
    const allResponses = await prisma.response.findMany({
        where: { attemptId: response.attemptId },
        select: { earnedPoints: true }
    });

    const totalScore = allResponses.reduce((acc, curr) => acc + (curr.earnedPoints ? parseFloat(String(curr.earnedPoints)) : 0), 0);

    await prisma.attempt.update({
        where: { id: response.attemptId },
        data: {
            score: totalScore
        }
    });

    return updatedResponse;
};