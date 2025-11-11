import { z } from 'zod';
import { runCodeSchema } from './grading.zod';
import * as gradingRepo from './grading.repo';
import { prisma } from '../../lib/prisma';
import { AttemptStatus, QType, Prisma } from '@prisma/client';
import { testCodeWithTestCases as testCodeWithTestCasesJudge0, executeCode as executeCodeJudge0 } from '../../lib/judge0';
import { testCodeWithTestCasesLocally, executeCodeLocally } from '../../lib/local-executor';
import { env } from '../../config/env';

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
  const { questionId, code, language, customInput } = input;

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
  if (attempt.status !== AttemptStatus.IN_PROGRESS) {
    throw { status: 403, message: 'Attempt is not in progress' };
  }

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
  const executionProvider = env.CODE_EXECUTION_PROVIDER || 'judge0';
  const jobData: Prisma.GradingJobCreateInput = {
    provider: executionProvider === 'local' ? 'local' : 'judge0',
    status: 'QUEUED',
    payload: { code, language, customInput: customInput || null },
    response: { connect: { id: response.id } },
  };
  const job = await gradingRepo.createGradingJob(jobData);

  // 5. --- Execute Code ---
  const executionProviderValue = executionProvider === 'local' ? 'local' : 'judge0';
  let result: any;

  if (customInput !== undefined && customInput !== null && customInput !== '') {
    // Run with custom input (single execution)
    const executionResult = executionProviderValue === 'local'
      ? await executeCodeLocally(code, language, customInput, 5000)
      : await executeCodeJudge0(code, language, customInput, 5000);

    // Format result for custom input
    result = {
      passed: 0,
      total: 0,
      testResults: [],
      message: 'Custom input execution',
      customOutput: {
        input: customInput,
        output: executionResult.stdout || '',
        error: executionResult.stderr || executionResult.error || null,
        status: executionResult.status.description,
        time: executionResult.time,
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

    // Filter to only visible test cases for student testing
    const visibleTestCases = testCases.filter((tc) => !tc.isHidden);

    if (visibleTestCases.length === 0) {
      throw { status: 400, message: 'No visible test cases found for this question' };
    }

    // Test code against visible test cases using the configured provider
    const testResults = executionProviderValue === 'local'
      ? await testCodeWithTestCasesLocally(
          code,
          language,
          visibleTestCases.map((tc) => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            timeoutMs: tc.timeoutMs || 5000, // Default 5 seconds for local execution
          }))
        )
      : await testCodeWithTestCasesJudge0(
          code,
          language,
          visibleTestCases.map((tc) => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            timeoutMs: tc.timeoutMs || 2000,
          }))
        );

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