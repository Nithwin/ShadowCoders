import { z } from 'zod';
import { runCodeSchema } from './grading.zod';
import * as gradingRepo from './grading.repo';
import { prisma } from '../../lib/prisma';
import { AttemptStatus, QType, Prisma } from '@prisma/client';
import { env } from '../../config/env';
import { submitCodeJob, waitForJobResult, submitAiJob, CodeExecutionJobData } from '../../lib/queue';

// Infer the TypeScript type from the Zod schema's body
type RunCodeInput = z.infer<typeof runCodeSchema>['body'];

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const findForbiddenKeyword = (code: string, forbiddenKeywords?: string): string | null => {
  if (!forbiddenKeywords) return null;

  const keywords = forbiddenKeywords
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k.length > 0);

  for (const keyword of keywords) {
    const escapedKeyword = escapeRegex(keyword);
    const boundaryPattern = /^[A-Za-z0-9_]+$/.test(keyword)
      ? `\\b${escapedKeyword}\\b`
      : escapedKeyword;
    const regex = new RegExp(boundaryPattern, 'i');
    if (regex.test(code)) {
      return keyword;
    }
  }

  return null;
};

/**
 * Handles the logic for running a student's code submission.
 */
export const runCode = async (
  studentId: string,
  attemptId: string,
  input: RunCodeInput
) => {
  const { questionId, code, language, customInput, runAllTests } = input;
  const answerWithSize = {
    code,
    language,
    codeSizeBytes: Buffer.byteLength(code, 'utf8'),
  };

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
    select: { examId: true, type: true, testcases: true, config: true, points: true },
  });

  if (!question) {
    throw { status: 404, message: 'Question not found' };
  }
  if (question.examId !== attempt.examId) {
    throw { status: 403, message: 'Question is not part of this exam' };
  }
  if (question.type !== QType.CODING && question.type !== QType.SQL) {
    throw { status: 400, message: 'This is not a coding or SQL question' };
  }

  // --- Validation: Forbidden Keywords ---
  const config = question.config as { forbiddenKeywords?: string } | null;
  const blockedKeyword = findForbiddenKeyword(code, config?.forbiddenKeywords);
  if (blockedKeyword) {
    throw { status: 400, message: `Forbidden keyword used: "${blockedKeyword}"` };
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
        type: question.type,
        answer: answerWithSize,
      },
      select: { id: true }
    });
    response = newResponse;
  } else {
    // Update the existing response with the latest code
    await prisma.response.update({
      where: { id: response.id },
      data: {
        answer: answerWithSize,
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

  // 5. --- Execute Code (via BullMQ) ---
  // Build BullMQ job payload with full context needed by the worker
  const queuePayload: CodeExecutionJobData = {
    jobId: job.id,
    responseId: response.id,
    code,
    language,
    ...(customInput ? { customInput } : {}),
    runAllTests: runAllTests || false,
    timeoutMs: 10000,
  };

  // If not a custom input run, we need to attach test cases for the worker
  if (!customInput) {
    const testCases = question.testcases as Array<{
      input: string;
      expectedOutput: string;
      isHidden?: boolean;
      timeoutMs?: number;
    }>;
    if (testCases && testCases.length > 0) {
      queuePayload.testCases = testCases.map((tc, idx) => ({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        timeoutMs: tc.timeoutMs || 10000,
        isHidden: tc.isHidden || false,
        originalIndex: idx,
      }));
      queuePayload.maxPoints = Number(question.points) || 0;
    }
  }

  try {
    await submitCodeJob(queuePayload);
    const jobResult = await waitForJobResult(job.id, 15000); // Wait up to 15s
    return jobResult;
  } catch (err: any) {
    if (err.message === 'Execution timed out') {
       throw { status: 504, message: 'Execution timed out' };
    }
    if (err.status === 503) {
       throw err; // Pass through backpressure 503
    }
    throw err;
  }
};

// --- ESSAY GRADING LOGIC ---

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
  
  // 2. Extract text answer
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

  // 4. Submit to BullMQ AI queue (async — frontend polls or uses socket for updates)
  await submitAiJob({
    jobId: job.id,
    responseId: response.id,
    provider: env.AI_PROVIDER || 'gemini',
  });

  // 5. Return immediately (Async)
  // The frontend should poll for updates or use a socket
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