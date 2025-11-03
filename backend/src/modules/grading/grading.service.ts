import { z } from 'zod';
import { runCodeSchema } from './grading.zod';
import * as gradingRepo from './grading.repo';
import { prisma } from '../../lib/prisma';
import { AttemptStatus, QType, Prisma } from '@prisma/client';

// Infer the TypeScript type from the Zod schema's body
type RunCodeInput = z.infer<typeof runCodeSchema>['body'];

/**
 * --- MOCK CODE JUDGE FUNCTION ---
 * In a real app, this function would make an API call to Judge0
 * or a similar service with the code and testcases.
 */
const executeCodeInJudge = async (
  code: string,
  language: string,
  testcases: any[]
): Promise<{ status: string; result: any }> => {
  console.log(`Simulating code execution for language: ${language}...`);
  // Simulate a 1-second delay for running code
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Mock result: Randomly pass or fail
  const isSuccess = Math.random() > 0.3; // 70% chance of success

  if (isSuccess) {
    console.log('Simulation: Code Accepted');
    return {
      status: 'SUCCEEDED',
      result: {
        stdout: 'All testcases passed!',
        verdict: 'Accepted',
      },
    };
  } else {
    console.log('Simulation: Code Failed');
    return {
      status: 'FAILED',
      result: {
        stdout: 'Testcase 3 failed: Expected 10, got 9',
        verdict: 'Wrong Answer',
      },
    };
  }
};
// --- END OF MOCK FUNCTION ---

/**
 * Handles the logic for running a student's code submission.
 */
export const runCode = async (
  studentId: string,
  attemptId: string,
  input: RunCodeInput
) => {
  const { questionId, code, language } = input;

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
  if (!question.testcases || (question.testcases as any[]).length === 0) {
    throw { status: 400, message: 'No test cases found for this question' };
  }
  
  // 3. --- Create Grading Job ---
  // First, find the response record to link the job to
  const response = await prisma.response.findFirst({
      where: { attemptId: attemptId, questionId: questionId },
      select: { id: true }
  });
  
  if (!response) {
      throw { status: 404, message: 'No response record found. Please submit an answer first.' };
  }

 const jobData: Prisma.GradingJobCreateInput = {
  provider: 'mock-judge',
  status: 'QUEUED',
  payload: { code, language }, // <-- Fixed (no cast needed)
  response: { connect: { id: response.id } },
};
  const job = await gradingRepo.createGradingJob(jobData);

  // 4. --- Execute Code (Mocked) ---
  const { status, result } = await executeCodeInJudge(
    code,
    language,
    question.testcases as any[]
  );

  // 5. --- Update Job with Result ---
  const finalJob = await gradingRepo.updateGradingJob(
    job.id,
    status,
    result
  );

  // 6. Return the execution result
  return finalJob.result;
};