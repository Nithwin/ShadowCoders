import * as attemptRepo from "./attempt.repo";
import { Prisma, ExamStatus, AttemptStatus, QType, GradingMode, Difficulty } from "@prisma/client";
import { shuffleArray } from "../../lib/utils";
import { prisma } from "../../lib/prisma";
import z from "zod";
import { listAttemptsSchema, submitAnswerSchema, resetAttemptsSchema, resumeAttemptsSchema } from "./attempt.zod";
import * as userRepo from "../auth/auth.repo";
import { gradeMCQ, gradeCoding } from "../grading/grading.logic";
import { executeCodeLocally, testCodeWithTestCasesLocally } from "../../lib/local-executor";
import { adaptiveService } from "../adaptive/adaptive.service";

export const startAttempt = async (studentId: string, examId: string) => {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      assignments: true,
      questions: { select: { id: true, difficulty: true } },
      attempts: {
        where: {
          studentId: studentId,
        },
        select: {
          id: true,
          attemptNo: true,
          status: true,
        },
        orderBy: {
          attemptNo: 'desc',
        },
      },
    },
  });

  if (!exam) {
    throw { status: 404, message: "Exam not found" };
  }
  if (exam.status !== ExamStatus.PUBLISHED) {
    throw { status: 403, message: "Exam is not published" };
  }
  const now = new Date();
  if (now < exam.startAt || now > exam.endAt) {
    throw { status: 403, message: "Exam is not currently active" };
  }

  // Fetch student cohort info for assignment matching
  const student = await userRepo.findStudentWithCohortInfo(studentId);
  if (!student) {
    throw { status: 404, message: "Student not found" };
  }

  // Determine if the exam is assigned to this student
  const isAssigned = exam.assignments.some((a) => {
    // Assigned to all
    if (a.assignToAll) return true;
    // Direct assignment by student id
    const ids = (a.studentIds as string[] | null) ?? null;
    if (ids && ids.includes(studentId)) return true;
    // Cohort-based assignment (requires all fields to match)
    if (
      a.cohortYear != null &&
      a.cohortDepartment != null &&
      a.cohortSection != null &&
      student.year != null &&
      student.department != null &&
      student.section != null
    ) {
      if (
        a.cohortYear === student.year &&
        a.cohortDepartment === student.department &&
        a.cohortSection === student.section
      ) {
        return true;
      }
    }
    return false;
  });
  if (!isAssigned) {
    throw { status: 403, message: "You are not assigned to this exam" };
  }

  // Use a transaction to prevent race conditions when multiple students start simultaneously
  // This ensures atomicity and prevents duplicate attempts
  const attempt = await prisma.$transaction(async (tx) => {
    // Re-fetch attempts within transaction to get latest state
    const currentAttempts = await tx.attempt.findMany({
      where: {
        examId: examId,
        studentId: studentId,
      },
      select: {
        id: true,
        attemptNo: true,
        status: true,
      },
      orderBy: {
        attemptNo: 'desc',
      },
    });

    const submittedAttempts = currentAttempts.filter(a => a.status === AttemptStatus.SUBMITTED);
    const submittedAttemptCount = submittedAttempts.length;

    // Check if student has reached max attempts
    if (exam.maxAttempts !== null && exam.maxAttempts !== undefined) {
      if (submittedAttemptCount >= exam.maxAttempts) {
        throw {
          status: 403,
          message: `You have reached the maximum number of attempts (${exam.maxAttempts}) for this exam.`
        };
      }
    }

    // Check if there's an in-progress attempt (within transaction)
    const inProgressAttempt = currentAttempts.find(a => a.status === AttemptStatus.IN_PROGRESS);
    if (inProgressAttempt) {
      // Return the existing in-progress attempt
      return await tx.attempt.findUnique({
        where: { id: inProgressAttempt.id },
        select: {
          id: true,
          examId: true,
          studentId: true,
          startedAt: true,
          status: true,
          orderMap: true,
          attemptNo: true,
        },
      });
    }

    // Calculate the next attempt number
    const nextAttemptNo = currentAttempts.length + 1;

    let orderMap: Prisma.InputJsonValue | null = null;
    
    if (exam.mode === 'DYNAMIC') {
      // Dynamic exams start empty. The adaptive service will populate the first question.
      orderMap = [];
    } else if (exam.randomizeQuestions && exam.questions.length > 0) {
      const questionIds = exam.questions.map((q) => q.id);
      orderMap = shuffleArray(questionIds) as Prisma.InputJsonValue;
    }

    const attemptData: Prisma.AttemptCreateInput = {
      status: AttemptStatus.IN_PROGRESS,
      attemptNo: nextAttemptNo,
      orderMap: orderMap ?? Prisma.JsonNull,
      student: { connect: { id: studentId } },
      exam: { connect: { id: examId } },
    };

    try {
      const newAttempt = await tx.attempt.create({
        data: attemptData,
        select: {
          id: true,
          examId: true,
          studentId: true,
          startedAt: true,
          status: true,
          orderMap: true,
          attemptNo: true,
        },
      });
      return newAttempt;
    } catch (error) {
      // Handle race condition: if another attempt was created between our check and create
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        // Re-check for in-progress attempt (it might have been created by another request)
        const latestAttempt = await tx.attempt.findFirst({
          where: {
            examId: examId,
            studentId: studentId,
            status: AttemptStatus.IN_PROGRESS,
          },
          select: {
            id: true,
            examId: true,
            studentId: true,
            startedAt: true,
            status: true,
            orderMap: true,
            attemptNo: true,
          },
          orderBy: {
            startedAt: 'desc',
          },
        });

        if (latestAttempt) {
          return latestAttempt;
        }

        throw { status: 409, message: "Attempt already exists. Please refresh and try again." };
      }
      throw error;
    }
  }, {
    // Increase timeout for transaction (in case of high concurrency)
    timeout: 10000, // 10 seconds
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable, // Strongest isolation
  });

  // If dynamic, ensure session is initialized and first question assigned
  if (exam.mode === 'DYNAMIC' && attempt) {
    if (!attempt.orderMap || (Array.isArray(attempt.orderMap) && attempt.orderMap.length === 0)) {
       await adaptiveService.startSession(studentId, examId, attempt.id);
       
       // Re-fetch to check if session start actually assigned a question
       const freshAttempt = await prisma.attempt.findUnique({
          where: { id: attempt.id },
          select: {
             id: true,
             examId: true,
             studentId: true,
             startedAt: true,
             status: true,
             orderMap: true,
             attemptNo: true,
          }
       });

       if (!freshAttempt?.orderMap || (Array.isArray(freshAttempt.orderMap) && freshAttempt.orderMap.length === 0)) {
         throw { status: 400, message: "No questions available for this dynamic exam. Please ask the administrator to 'Regenerate Questions' first." };
       }
       return freshAttempt;
    }
  }

  return attempt;
};


type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>["body"];



/**
 * Handles adaptive question assignment for Dynamic Exams.
 * Called after a response is submitted.
 */
const handleAdaptiveProgression = async (attemptId: string, lastResponse: { questionId: string; verdict: string | null; earnedPoints?: any }) => {
  try {
     await adaptiveService.progressSession(attemptId, lastResponse);
  } catch (err) {
    console.error(`[Adaptive] Error progressing session for attempt ${attemptId}:`, err);
  }
};

export const submitAnswer = async (
  studentId: string,
  attemptId: string,
  input: SubmitAnswerInput
) => {
  const { questionId, answer } = input;

  // First, fetch question to determine if we need queue (coding questions have more frequent auto-saves)
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { examId: true, type: true },
  });

  if (!question) {
    throw { status: 404, message: "Question not found" };
  }

  // Use queue system for all question types to prevent race conditions
  // The queue ensures requests for the same (attemptId, questionId) are processed sequentially
  // This is especially important for coding questions with auto-save, but applies to all types
  const { answerQueue } = await import("../../lib/queues/answer-queue");

  // Higher priority for non-coding questions (they're usually manual submissions)
  // Coding questions get lower priority since they're auto-saved frequently
  const priority = question.type === QType.CODING ? 0 : 1;

  // We need to fetch more specific question details for proper server-side grading (MCQ)
  // Re-fetch question with more fields if it's an MCQ
  let questionDetails: any = question;
  if (question.type === QType.MCQ) {
    questionDetails = await prisma.question.findUnique({
      where: { id: questionId },
      select: {
        examId: true,
        type: true,
        points: true,
        correctOptionIds: true
      },
    });
  }

  return answerQueue.enqueue(
    attemptId,
    questionId,
    async () => {
      const attempt = await prisma.attempt.findUnique({
        where: { id: attemptId },
        select: {
          studentId: true,
          status: true,
          examId: true,
        },
      });

      if (!attempt) {
        throw { status: 404, message: "Attempt not found" };
      }

      if (attempt.studentId !== studentId) {
        throw {
          status: 403,
          message: "You are not authorized to modify this attempt",
        };
      }

      // Allow students to edit answers even after submission
      // We allow editing for both IN_PROGRESS and SUBMITTED status

      if (question.examId !== attempt.examId) {
        throw {
          status: 403,
          message: "Forbidden: Question does not belong to this exam",
        };
      }

      // For SPEAKING questions, extract audioAssetId from answer if present
      let audioAssetId: string | undefined;
      if (question.type === QType.SPEAKING && answer && typeof answer === 'object' && 'audioAssetId' in answer) {
        audioAssetId = answer.audioAssetId as string;
      }

      // Extract optional grading fields from input
      let { earnedPoints, verdict, gradingMode } = input;

      // --- SERVER-SIDE AUTO-GRADING (For MCQ) ---
      // Security/Reliability: Always grade MCQ on server
      if (question.type === QType.MCQ && questionDetails?.correctOptionIds) {
        const gradingResult = gradeMCQ(
          answer as { chosenOptionIds?: string[] },
          questionDetails.correctOptionIds as string[],
          Number(questionDetails.points)
        );
        earnedPoints = gradingResult.earnedPoints;
        verdict = gradingResult.verdict;
        gradingMode = gradingResult.gradingMode;
      }

      const responseData: Parameters<typeof attemptRepo.upsertResponse>[0] = {
        attemptId: attemptId,
        questionId: questionId,
        answer: answer ? (answer as Prisma.InputJsonValue) : Prisma.JsonNull,
        type: question.type,
        ...(audioAssetId !== undefined && { audioAssetId }),
        // Pass grading fields
        ...(earnedPoints !== undefined && { earnedPoints }),
        ...(verdict !== undefined && { verdict }),
        ...(gradingMode !== undefined && { gradingMode }),
      };
      const savedResponse = await attemptRepo.upsertResponse(responseData);

      // --- Adaptive Progression ---
      // If this is a Dynamic Exam, assign the next question based on this result
      await handleAdaptiveProgression(attemptId, savedResponse);

      return savedResponse;
    },
    priority
  );
};

// ----------------------------------------------------------------------
// OPTIMIZED SUBMIT LOGIC (Serialized for Stability)
// ----------------------------------------------------------------------
export const submitAttempt = async (studentId: string, attemptId: string, submissionReason?: string) => {
  // 1. Fetch all data needed for grading in ONE query (reduce DB roundtrips)
  const attempt = await attemptRepo.getAttemptForSubmission(attemptId);

  // 2. --- Validation Checks ---
  if (!attempt) {
    throw { status: 404, message: 'Attempt not found' };
  }
  if (attempt.studentId !== studentId) {
    throw { status: 403, message: 'Forbidden: Attempt does not belong to this student' };
  }
  if (attempt.status !== AttemptStatus.IN_PROGRESS) {
    throw { status: 403, message: `Attempt has already been ${attempt.status.toLowerCase()}` };
  }

  // 3. --- In-Memory Grading Calculation (SERIALIZED) ---
  // We calculate everything FIRST before touching the database.
  // CRITICAL CHANGE: We use a for-loop instead of Promise.all to grade sequentially.
  // This prevents CPU spikes and timeouts when submitting many coding questions at once.

  let totalScore = 0;
  let maxScore = 0;

  // Prepare updates for bulk execution
  const responseUpdates: Array<{
    questionId: string;
    earnedPoints: number;
    verdict: string;
    gradingMode: GradingMode;
    feedback?: string | undefined;
  }> = [];

  for (const question of attempt.exam.questions) {
    // Add question's points to the max possible score
    const questionPoints = Number(question.points);
    maxScore += questionPoints; // Accumulate maxScore

    // Find the student's response
    const response = attempt.responses.find((r) => r.questionId === question.id);

    // --- FORCE FULL MARKS CHECK ---
    const config = (question as any).config;
    if (config && config.forceFullMarks === true) {
      if (response) {
        responseUpdates.push({
          questionId: question.id,
          earnedPoints: questionPoints,
          verdict: 'PASS',
          gradingMode: GradingMode.AUTO,
          feedback: 'Full marks awarded by staff override.',
        });
        totalScore += questionPoints;
      }
      // If no response, we still added to maxScore, but 0 to totalScore
      continue;
    }

    if (response) {
      // 3. --- USE STORED GRADING RESULT ---
      // We no longer re-grade on submit. We trust the incremental grading (client-side or previous server-side).

      // Add to total score
      const points = Number(response.earnedPoints) || 0;
      totalScore += points;

      // Ensure we have a verdict and grading mode, defaulting if missing
      const verdict = response.verdict || (points >= questionPoints ? 'PASS' : (points > 0 ? 'PARTIAL' : 'FAIL'));
      const gradingMode = response.gradingMode || GradingMode.AUTO; // Default to AUTO if missing

      // Add to update list (to ensure consistency, though strictly strictly strictly strictly not needed if we trust DB, 
      // but good to enforce "Snapshotting" the final state in case we want to lock it down)
      // Actually, if we just trust the DB, we might not need to update anything unless we want to "Seal" it.
      // But preserving the existing logic structure:

      responseUpdates.push({
        questionId: question.id,
        earnedPoints: points,
        verdict: verdict,
        gradingMode: gradingMode as GradingMode,
        feedback: undefined // Or keep existing feedback?
      });
    } else {
      // No response, 0 points
    }
  }

  // 4. --- Atomic Transaction execution ---
  // We execute ALL DB writes in a single transaction.

  return await prisma.$transaction(async (tx) => {
    // a. Double-check status inside transaction (optimistic locking)
    const currentStatus = await tx.attempt.findUnique({
      where: { id: attemptId },
      select: { status: true }
    });

    if (!currentStatus || currentStatus.status !== AttemptStatus.IN_PROGRESS) {
      throw { status: 409, message: 'Attempt already submitted or invalid' };
    }

    // b. Bulk Update Responses
    const updatePromises = responseUpdates.map(update =>
      tx.response.updateMany({
        where: {
          attemptId: attemptId,
          questionId: update.questionId
        },
        data: {
          earnedPoints: update.earnedPoints,
          verdict: update.verdict,
          gradingMode: update.gradingMode,
          feedback: update.feedback || null
        }
      })
    );

    await Promise.all(updatePromises);

    // c. Update Final Attempt Status
    const submissionType = submissionReason ? 'AUTO' : 'NORMAL';

    const submittedAttempt = await tx.attempt.update({
      where: { id: attemptId },
      data: {
        status: AttemptStatus.SUBMITTED,
        submittedAt: new Date(),
        score: totalScore,
        maxScore: maxScore,
        submissionType: submissionType,
        submissionReason: submissionReason || null,
        timeSpentSec: Math.floor((new Date().getTime() - new Date(attempt.startedAt).getTime()) / 1000),
      },
    });

    return submittedAttempt;
  }, {
    timeout: 30000, // Increased timeout for transaction (grading is done outside, but just in case)
    isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted
  });
};

/**
 * Re-evaluates a specific attempt by re-running the grading logic for all questions.
 * Used by admins to fix "wrong marks" or "zero marks" issues.
 */
export const reevaluateAttempt = async (attemptId: string, dryRun: boolean = false) => {
  console.log(`[Re-evaluate] Starting re-evaluation for attempts ${attemptId} (dryRun=${dryRun})`);

  // 1. Fetch attempt and exam data
  const attempt = await attemptRepo.getAttemptForSubmission(attemptId);

  if (!attempt) {
    throw { status: 404, message: 'Attempt not found' };
  }

  // Allow re-evaluation for SUBMITTED or IN_PROGRESS (though usually SUBMITTED)

  let totalScore = 0;
  let maxScore = 0;

  // Prepare updates
  const responseUpdates: Array<{
    questionId: string;
    earnedPoints: number;
    verdict: string;
    gradingMode: GradingMode;
    feedback?: string | undefined;
  }> = [];

  // 2. Serialize Grading Loop
  for (const question of attempt.exam.questions) {
    const questionPoints = Number(question.points);
    maxScore += questionPoints;

    const response = attempt.responses.find((r) => r.questionId === question.id);

    // Force full marks override
    const config = (question as any).config;
    if (config && config.forceFullMarks === true) {
      if (response) {
        responseUpdates.push({
          questionId: question.id,
          earnedPoints: questionPoints,
          verdict: 'PASS',
          gradingMode: GradingMode.AUTO,
          feedback: 'Full marks awarded by staff override.',
        });
        totalScore += questionPoints;
      }
      continue;
    }

    if (response && response.answer) {
      let gradingResult: any = {
        earnedPoints: 0,
        verdict: 'FAIL',
        gradingMode: GradingMode.MANUAL,
      };

      // Preserve existing manual grades if we want?
      // User asked to "re-sub coding... and grade again".
      // Usually re-evaluation implies re-running AUTO grading. Manual grades might be overridden?
      // Let's assume we re-run EVERYTHING that is auto-gradable.
      // If it was manually graded (ESSAY), we skip re-grading but keep points?
      // For safety, let's only re-grade AUTO types (MCQ, CODING, SQL).

      const isAutoGradable = [QType.MCQ, QType.CODING, QType.SQL].includes(question.type as any);

      if (!isAutoGradable) {
        // Keep existing score for manual questions
        totalScore += Number(response.earnedPoints) || 0;
        continue;
      }

      try {
        switch (question.type) {
          case QType.MCQ:
            gradingResult = gradeMCQ(
              response.answer as { chosenOptionIds?: string[] },
              question.correctOptionIds as string[],
              questionPoints
            );
            break;

          case QType.CODING:
            console.log(`[Re-evaluate] Grading Coding Question ${question.id}...`);
            // Add a small delay to let system breathe if needed
            await new Promise(r => setTimeout(r, 100));

            gradingResult = await gradeCoding(
              response.answer as { code?: string; language?: string },
              question.testcases as any[],
              questionPoints
            );
            break;

          case QType.SQL:
            const sqlConfig = (question as any).config;
            const ddl = sqlConfig?.ddl || '';
            const sqlTestCases = (question.testcases as any[]).map((tc) => ({
              ...tc,
              input: ddl ? `${ddl}\n${tc.input}` : tc.input,
            }));

            console.log(`[Re-evaluate] Grading SQL Question ${question.id}...`);
            gradingResult = await gradeCoding(
              response.answer as { code?: string; language?: string },
              sqlTestCases,
              questionPoints
            );
            break;
        }
      } catch (err) {
        console.error(`[Re-evaluate] Error grading question ${question.id}:`, err);
        // On error, keep 0
      }

      if (gradingResult.gradingMode === GradingMode.AUTO) {
        totalScore += gradingResult.earnedPoints;
      }

      responseUpdates.push({
        questionId: question.id,
        earnedPoints: gradingResult.earnedPoints,
        verdict: gradingResult.verdict,
        gradingMode: gradingResult.gradingMode,
        feedback: undefined
      });
    } else {
      // No response, 0 points
    }
  }

  // If dry run, return results without updating DB
  if (dryRun) {
    return {
      message: 'Dry run complete',
      newScore: totalScore,
      responseUpdates // Return the full grading data
    };
  }

  // 3. Update Database
  await applyReevaluationResults(attemptId, totalScore, maxScore, responseUpdates);

  return { message: 'Re-evaluation complete', newScore: totalScore };
};

/**
 * Applies pre-calculated re-evaluation results to the database.
 * This avoids re-running the heavy grading logic during the "Save" phase.
 */
export const applyReevaluationResults = async (
  attemptId: string,
  score: number,
  maxScore: number,
  responseUpdates: Array<{
    questionId: string;
    earnedPoints: number;
    verdict: string;
    gradingMode: GradingMode;
    feedback?: string | undefined;
  }>
) => {
  return await prisma.$transaction(async (tx) => {
    // Update responses
    for (const update of responseUpdates) {
      await tx.response.updateMany({
        where: {
          attemptId: attemptId,
          questionId: update.questionId
        },
        data: {
          earnedPoints: update.earnedPoints,
          verdict: update.verdict,
          gradingMode: update.gradingMode,
          feedback: update.feedback || null
        }
      });
    }

    // Update attempt score
    await tx.attempt.update({
      where: { id: attemptId },
      data: {
        score: score,
        maxScore: maxScore
      }
    });
  }, {
    timeout: 30000
  });
};

export const forceSubmitAttempt = async (attemptId: string, submissionReason?: string) => {
  // 1. Fetch all data needed for grading
  const attempt = await attemptRepo.getAttemptForSubmission(attemptId);

  // 2. --- Validation Checks ---
  if (!attempt) {
    throw { status: 404, message: 'Attempt not found' };
  }
  if (attempt.status !== AttemptStatus.IN_PROGRESS) {
    throw { status: 403, message: `Attempt has already been ${attempt.status.toLowerCase()}` };
  }

  let totalScore = 0;
  let maxScore = 0;

  for (const question of attempt.exam.questions) {
    // Add question's points to the max possible score
    const questionPoints = Number(question.points);
    maxScore += questionPoints;

    // Find the student's response for this question
    const response = attempt.responses.find((r) => r.questionId === question.id);

    // CHECK FOR FORCE FULL MARKS OVERRIDE via Question Config
    const config = (question as any).config;
    if (config && config.forceFullMarks === true) {
      totalScore += questionPoints;

      if (response) {
        await prisma.response.updateMany({
          where: {
            attemptId: attemptId,
            questionId: question.id,
          },
          data: {
            earnedPoints: questionPoints,
            verdict: 'PASS',
            gradingMode: GradingMode.AUTO,
            feedback: 'Full marks awarded by staff override.',
          },
        });
      }
      continue;
    }

    if (response && response.answer) {
      // Auto-grade based on question type
      let gradingResult: any = {
        earnedPoints: 0,
        verdict: 'FAIL',
        gradingMode: GradingMode.MANUAL,
      }; switch (question.type) {
        case QType.MCQ:
          gradingResult = gradeMCQ(
            response.answer as { chosenOptionIds?: string[] },
            question.correctOptionIds as string[],
            questionPoints
          );
          break;

        case QType.CODING:
          gradingResult = await gradeCoding(
            response.answer as { code?: string; language?: string },
            question.testcases as any[],
            questionPoints
          );
          break;

        case QType.SQL:
          const sqlConfigForce = (question as any).config;
          const ddlForce = sqlConfigForce?.ddl || '';
          const sqlTestCasesForce = (question.testcases as any[]).map((tc) => ({
            ...tc,
            input: ddlForce ? `${ddlForce}\n${tc.input}` : tc.input,
          }));

          gradingResult = await gradeCoding(
            response.answer as { code?: string; language?: string },
            sqlTestCasesForce,
            questionPoints
          );
          break;

        case QType.ESSAY:
        case QType.SPEAKING:
          gradingResult = {
            earnedPoints: 0,
            verdict: 'PENDING',
            gradingMode: GradingMode.MANUAL,
          };
          break;

        default:
          gradingResult = {
            earnedPoints: 0,
            verdict: 'FAIL',
            gradingMode: GradingMode.MANUAL,
          };
      }

      if (gradingResult.gradingMode === GradingMode.AUTO) {
        totalScore += gradingResult.earnedPoints;
      }

      if (gradingResult.gradingMode === GradingMode.AUTO) {
        await prisma.response.updateMany({
          where: {
            attemptId: attemptId,
            questionId: question.id,
          },
          data: {
            earnedPoints: gradingResult.earnedPoints,
            verdict: gradingResult.verdict,
            gradingMode: gradingResult.gradingMode,
          },
        });
      }
    }
  }

  // Update the Attempt in the Database
  const submittedAttempt = await prisma.attempt.update({
    where: { id: attemptId },
    data: {
      status: AttemptStatus.SUBMITTED,
      submittedAt: new Date(),
      score: totalScore,
      maxScore: maxScore,
      submissionType: 'AUTO',
      submissionReason: submissionReason || 'Force submitted by admin',
      timeSpentSec: Math.floor((new Date().getTime() - new Date(attempt.startedAt).getTime()) / 1000),
    },
  });

  // Points are now awarded manually by admin from the submissions page
  // No automatic points awarding on force submit

  return submittedAttempt;
};

export const getAttemptDetails = async (
  studentId: string,
  attemptId: string
) => {
  // 1. Fetch all attempt data from the repository
  const attempt = await attemptRepo.getAttemptDetails(attemptId);

  // 2. --- Validation Checks ---
  if (!attempt) {
    throw { status: 404, message: 'Attempt not found' };
  }

  // 3. --- Security Check ---
  // Ensure the logged-in student is the one who owns this attempt
  if (attempt.studentId !== studentId) {
    throw { status: 403, message: 'Forbidden: You do not have access to this attempt' };
  }

  // (Optional) You could also check if the attempt is IN_PROGRESS,
  // but it's often useful to let students view submitted attempts too.
  // We'll leave this check out for now.

  // 4. Return the full attempt details
  
  // --- DYNAMIC EXAM FIX ---
  const exam = attempt.exam as any;

  console.log('[DEBUG] getAttemptDetails Mode:', exam?.mode);
  console.log('[DEBUG] getAttemptDetails OrderMap:', attempt.orderMap);
  console.log('[DEBUG] getAttemptDetails Total Questions:', exam?.questions?.length);

  if (exam && exam.mode === 'DYNAMIC' && attempt.orderMap && Array.isArray(attempt.orderMap)) {
     const visibleIds = attempt.orderMap as string[];
     console.log('[DEBUG] Visible IDs:', visibleIds);
     if (exam.questions && Array.isArray(exam.questions)) {
        const questionMap = new Map(exam.questions.map((q: any) => [q.id, q]));
        const filteredQuestions = visibleIds.map(id => questionMap.get(id)).filter(q => !!q);
        console.log('[DEBUG] Filtered Questions Count:', filteredQuestions.length);
        exam.questions = filteredQuestions;
     }
  }

  return attempt;
};

export const getQuestionById = (questionId: string) => {
  return prisma.question.findUnique({
    where: { id: questionId },
    select: {
      id: true,
      examId: true,
      type: true,
      prompt: true,
      points: true,
      order: true,
      // Include all fields a student might need
      options: true,
      starterCode: true,
      languageHints: true,
      wordLimit: true,
      mediaAssetId: true,
      mediaAsset: {
        select: {
          id: true,
          url: true,
          kind: true,
        },
      },
      passageAssetId: true,
      maxDurationSec: true,
      clozeTemplate: true,
      config: true,

      // Explicitly select fields needed for scrubbing
      testcases: true,
      // We do NOT select correctOptionIds or blanks, 
      // as the service layer will handle scrubbing.
      // Or, we can select them and trust the service layer to remove them.
      // Let's select them for now.
      correctOptionIds: true,
      blanks: true
    },
  });
};

export const getQuestionForStudent = async (
  attemptId: string,
  questionId: string,
  studentId: string
) => {
  try {
    // 1. Verify the attempt belongs to the student
    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      select: { studentId: true, examId: true, status: true },
    });

    if (!attempt) {
      throw { status: 404, message: 'Attempt not found' };
    }

    if (attempt.studentId !== studentId) {
      throw { status: 403, message: 'Forbidden: You do not have access to this attempt' };
    }

    // 2. Get the question
    const question = await getQuestionById(questionId);

    if (!question) {
      throw { status: 404, message: 'Question not found' };
    }

    if (question.examId !== attempt.examId) {
      throw { status: 403, message: 'Question is not part of this exam' };
    }

    // 3. Scrub the question data for students
    const scrubbedQuestion: any = {
      id: question.id,
      type: question.type,
      prompt: question.prompt,
      points: question.points,
      order: question.order,
      options: question.options,
      starterCode: question.starterCode,
      wordLimit: question.wordLimit,
      // Remove correctOptionIds and blanks
      // For coding questions, only show visible test cases
      testcases: question.type === QType.CODING && Array.isArray(question.testcases)
        ? (question.testcases as any[]).filter((tc: any) => !tc.isHidden)
        : undefined,
      config: question.config,
    };

    return scrubbedQuestion;
  } catch (error) {
    console.error('Error in getQuestionForStudent:', error);
    throw error;
  }
};

export const getAttemptResults = async (
  studentId: string,
  attemptId: string
) => {
  // 1. Fetch all result data from the repository
  const attemptResults = await attemptRepo.getAttemptResults(attemptId) as any;

  // 2. --- Validation Checks ---
  if (!attemptResults) {
    throw { status: 404, message: 'Attempt not found' };
  }

  // 3. --- Security Check ---
  // Ensure the logged-in student is the one who owns this attempt
  if (attemptResults.studentId !== studentId) {
    throw { status: 403, message: 'Forbidden: You do not have access to this attempt' };
  }

  // 4. --- Business Logic Check ---
  // Ensure the student can only see results for a submitted exam
  if (attemptResults.status !== AttemptStatus.SUBMITTED) {
    throw { status: 403, message: 'Forbidden: Results are not available for this attempt yet' };
  }

  // 4a. Check if results are released
  const exam = attemptResults.exam as any;

  if (exam.releaseResults === false) {
    // Results are locked - hide ALL results
    // Check if exam has manual grading questions
    const hasManualGrading = exam.questions?.some((q: any) => {
      const qType = q.type;
      return qType === QType.ESSAY || qType === QType.SPEAKING;
    });

    // Return locked state with no score or response data
    return {
      id: attemptResults.id,
      studentId: attemptResults.studentId,
      status: attemptResults.status,
      startedAt: attemptResults.startedAt,
      submittedAt: attemptResults.submittedAt,
      submissionType: attemptResults.submissionType,
      submissionReason: attemptResults.submissionReason,
      exam: {
        id: exam.id,
        title: exam.title,
        questions: exam.questions, // Include questions for display structure
      },
      responses: [], // No responses shown when locked
      message: hasManualGrading
        ? "Results are pending manual grading by staff. Please check back later."
        : "Results are currently locked by the administrator.",
      isLocked: true,
      hasManualGrading,
    };
  }

  // 5. Scrub hidden test cases from the results
  // This ensures students cannot see hidden test cases in the network response
  if (attemptResults.exam && attemptResults.exam.questions) {
    attemptResults.exam.questions.forEach((q: any) => {
      if (q.type === QType.CODING && Array.isArray(q.testcases)) {
        q.testcases = q.testcases.filter((tc: any) => !tc.isHidden);
      }
    });
  }

  if (attemptResults.responses && Array.isArray(attemptResults.responses)) {
    attemptResults.responses.forEach((r: any) => {
      if (r.question && r.question.type === QType.CODING && Array.isArray(r.question.testcases)) {
        r.question.testcases = r.question.testcases.filter((tc: any) => !tc.isHidden);
      }
    });

    // 6. Sort responses by question order for consistent display
    attemptResults.responses.sort((a: any, b: any) => {
      const orderA = a.question?.order ?? 999;
      const orderB = b.question?.order ?? 999;
      return orderA - orderB;
    });
  }

  // 7. Calculate and add rank information
  const rankInfo = await calculateStudentRank(attemptResults.examId, studentId);

  // 8. Return the full results with rank
  return {
    ...attemptResults,
    rank: rankInfo.rank,
    totalParticipants: rankInfo.totalParticipants,
  };
};

/**
 * Calculate the rank of a student for a specific exam
 * Ranking is based on:
 * 1. Score (descending) - higher score = better rank
 * 2. Time spent (ascending) - faster completion = better rank (if same score)
 * 3. Submission time (ascending) - earlier submission = better rank (if same score and time)
 */
export const calculateStudentRank = async (
  examId: string,
  studentId: string
): Promise<{ rank: number | null; totalParticipants: number }> => {
  // Get all submitted attempts for this exam, ordered by:
  // 1. Score (descending)
  // 2. Time spent (ascending) - faster is better
  // 3. SubmittedAt (ascending) - earlier submission is better
  const allAttempts = await prisma.attempt.findMany({
    where: {
      examId: examId,
      status: AttemptStatus.SUBMITTED,
      score: { not: null },
    },
    select: {
      id: true,
      studentId: true,
      score: true,
      timeSpentSec: true,
      submittedAt: true,
    },
    orderBy: [
      { score: 'desc' },
      { timeSpentSec: 'asc' },
      { submittedAt: 'asc' },
    ],
  });

  if (allAttempts.length === 0) {
    return { rank: null, totalParticipants: 0 };
  }

  // Get the best attempt for each student (highest score, then fastest time)
  const studentBestAttempts = new Map<string, typeof allAttempts[0]>();

  for (const attempt of allAttempts) {
    const existing = studentBestAttempts.get(attempt.studentId);
    if (!existing) {
      studentBestAttempts.set(attempt.studentId, attempt);
    } else {
      // Compare: score first, then time, then submission time
      const existingScore = Number(existing.score || 0);
      const attemptScore = Number(attempt.score || 0);

      if (attemptScore > existingScore) {
        studentBestAttempts.set(attempt.studentId, attempt);
      } else if (attemptScore === existingScore) {
        const existingTime = existing.timeSpentSec || 0;
        const attemptTime = attempt.timeSpentSec || 0;

        if (attemptTime < existingTime) {
          studentBestAttempts.set(attempt.studentId, attempt);
        } else if (attemptTime === existingTime && attempt.submittedAt && existing.submittedAt) {
          if (attempt.submittedAt < existing.submittedAt) {
            studentBestAttempts.set(attempt.studentId, attempt);
          }
        }
      }
    }
  }

  // Convert to array and sort again for ranking
  const rankedAttempts = Array.from(studentBestAttempts.values()).sort((a, b) => {
    const scoreA = Number(a.score || 0);
    const scoreB = Number(b.score || 0);

    if (scoreB !== scoreA) {
      return scoreB - scoreA; // Higher score = better
    }

    const timeA = a.timeSpentSec || 0;
    const timeB = b.timeSpentSec || 0;

    if (timeA !== timeB) {
      return timeA - timeB; // Faster = better
    }

    // If same score and time, earlier submission wins
    if (a.submittedAt && b.submittedAt) {
      return a.submittedAt.getTime() - b.submittedAt.getTime();
    }

    return 0;
  });

  const totalParticipants = rankedAttempts.length;

  // Find the student's rank
  const studentRank = rankedAttempts.findIndex(
    (attempt) => attempt.studentId === studentId
  );

  if (studentRank === -1) {
    return { rank: null, totalParticipants };
  }

  // Rank is 1-indexed (1st place, 2nd place, etc.)
  return { rank: studentRank + 1, totalParticipants };
};

/**
 * Get leaderboard for an exam
 * Returns top N students ranked by their best attempt
 */
export const getExamLeaderboard = async (
  examId: string,
  studentId: string,
  limit: number = 50
): Promise<{
  leaderboard: Array<{
    rank: number;
    studentId: string;
    studentName: string | null;
    studentEmail: string;
    studentRegNo: string | null;
    score: number;
    maxScore: number;
    timeSpentSec: number;
    submittedAt: Date | null;
    isCurrentStudent: boolean;
  }>;
  currentStudentRank: number | null;
  totalParticipants: number;
}> => {
  // Get all submitted attempts for this exam
  const allAttempts = await prisma.attempt.findMany({
    where: {
      examId: examId,
      status: AttemptStatus.SUBMITTED,
      score: { not: null },
    },
    select: {
      id: true,
      studentId: true,
      score: true,
      maxScore: true,
      timeSpentSec: true,
      submittedAt: true,
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          reg_no: true,
        },
      },
    },
    orderBy: [
      { score: 'desc' },
      { timeSpentSec: 'asc' },
      { submittedAt: 'asc' },
    ],
  });

  if (allAttempts.length === 0) {
    return {
      leaderboard: [],
      currentStudentRank: null,
      totalParticipants: 0,
    };
  }

  // Get the best attempt for each student
  const studentBestAttempts = new Map<string, typeof allAttempts[0]>();

  for (const attempt of allAttempts) {
    const existing = studentBestAttempts.get(attempt.studentId);
    if (!existing) {
      studentBestAttempts.set(attempt.studentId, attempt);
    } else {
      const existingScore = Number(existing.score || 0);
      const attemptScore = Number(attempt.score || 0);

      if (attemptScore > existingScore) {
        studentBestAttempts.set(attempt.studentId, attempt);
      } else if (attemptScore === existingScore) {
        const existingTime = existing.timeSpentSec || 0;
        const attemptTime = attempt.timeSpentSec || 0;

        if (attemptTime < existingTime) {
          studentBestAttempts.set(attempt.studentId, attempt);
        } else if (attemptTime === existingTime && attempt.submittedAt && existing.submittedAt) {
          if (attempt.submittedAt < existing.submittedAt) {
            studentBestAttempts.set(attempt.studentId, attempt);
          }
        }
      }
    }
  }

  // Sort for ranking
  const rankedAttempts = Array.from(studentBestAttempts.values()).sort((a, b) => {
    const scoreA = Number(a.score || 0);
    const scoreB = Number(b.score || 0);

    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }

    const timeA = a.timeSpentSec || 0;
    const timeB = b.timeSpentSec || 0;

    if (timeA !== timeB) {
      return timeA - timeB;
    }

    if (a.submittedAt && b.submittedAt) {
      return a.submittedAt.getTime() - b.submittedAt.getTime();
    }

    return 0;
  });

  const totalParticipants = rankedAttempts.length;

  // Find current student's rank
  const currentStudentIndex = rankedAttempts.findIndex(
    (attempt) => attempt.studentId === studentId
  );
  const currentStudentRank = currentStudentIndex === -1 ? null : currentStudentIndex + 1;

  // Get top N for leaderboard
  const topAttempts = rankedAttempts.slice(0, limit);

  // Build leaderboard response
  const leaderboard = topAttempts.map((attempt, index) => ({
    rank: index + 1,
    studentId: attempt.studentId,
    studentName: attempt.student.name,
    studentEmail: attempt.student.email,
    studentRegNo: attempt.student.reg_no,
    score: Number(attempt.score || 0),
    maxScore: Number(attempt.maxScore || 0),
    timeSpentSec: attempt.timeSpentSec,
    submittedAt: attempt.submittedAt,
    isCurrentStudent: attempt.studentId === studentId,
  }));

  return {
    leaderboard,
    currentStudentRank,
    totalParticipants,
  };
};

type ListAttemptsQuery = z.infer<typeof listAttemptsSchema>['query'];

export const listAttemptsForExam = async (
  examId: string,
  query: ListAttemptsQuery
) => {
  // Ensure page and pageSize are numbers
  const page = typeof query.page === 'string' ? parseInt(query.page, 10) : (query.page ?? 1);
  const pageSize = typeof query.pageSize === 'string' ? parseInt(query.pageSize, 10) : (query.pageSize ?? 20);
  const searchQuery = query.q?.trim() || undefined;

  // 1. Call the repository to get attempts and the total count
  const { attempts, totalCount } = await attemptRepo.listAttemptsForExam({
    examId,
    page,
    pageSize,
    ...(searchQuery ? { searchQuery } : {}),
  });

  // 2. Calculate pagination metadata
  const totalPages = Math.ceil(totalCount / pageSize);

  // 3. Return the data and metadata
  return {
    data: attempts,
    meta: {
      page,
      pageSize,
      totalCount,
      totalPages,
    },
  };
};

export const getStudentAttempts = async (studentId: string) => {
  // Get all submitted attempts for this student
  const attempts = await attemptRepo.getStudentAttempts(studentId);
  return attempts;
};

export const getAttemptForAdmin = async (attemptId: string) => {
  // 1. Fetch all attempt data from the repository
  const attempt = await attemptRepo.getFullAttemptForAdmin(attemptId);

  // 2. --- Validation Check ---
  if (!attempt) {
    throw { status: 404, message: 'Attempt not found' };
  }

  // 3. Sort responses by question order for consistent display
  if (attempt.responses && Array.isArray(attempt.responses)) {
    attempt.responses.sort((a: any, b: any) => {
      const orderA = a.question?.order ?? 999;
      const orderB = b.question?.order ?? 999;
      return orderA - orderB;
    });
  }

  // 4. Return the full attempt details
  return attempt;
};

type ResetAttemptsInput = z.infer<typeof resetAttemptsSchema>['body'];

export const resetAttempts = async (input: ResetAttemptsInput) => {
  const { examId, studentIds, resetAll } = input;

  // Verify exam exists
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: { id: true, title: true },
  });

  if (!exam) {
    throw { status: 404, message: 'Exam not found' };
  }

  // Build where clause for attempts to delete/reset
  // For reattempts, we should reset both SUBMITTED and IN_PROGRESS attempts
  // This ensures a clean slate when giving reattempts
  const whereClause: Prisma.AttemptWhereInput = {
    examId: examId,
    status: {
      in: [AttemptStatus.SUBMITTED, AttemptStatus.IN_PROGRESS], // Delete both submitted and in-progress attempts for reattempts
    },
  };

  if (!resetAll && studentIds && studentIds.length > 0) {
    whereClause.studentId = { in: studentIds };
  }

  // Get all attempts to delete
  const attemptsToDelete = await prisma.attempt.findMany({
    where: whereClause,
    select: { id: true },
  });

  const attemptIds = attemptsToDelete.map(a => a.id);

  if (attemptIds.length === 0) {
    return {
      deletedCount: 0,
      message: 'No attempts found to reset',
    };
  }

  // Get all response IDs for these attempts
  const responsesToDelete = await prisma.response.findMany({
    where: {
      attemptId: { in: attemptIds },
    },
    select: { id: true },
  });

  const responseIds = responsesToDelete.map(r => r.id);

  // Delete related records in correct order (respecting foreign key constraints)
  if (responseIds.length > 0) {
    // 1. Delete GradingJobs (references Response)
    await prisma.gradingJob.deleteMany({
      where: {
        responseId: { in: responseIds },
      },
    });

    // 2. Delete Evaluations (references Response)
    await prisma.evaluation.deleteMany({
      where: {
        responseId: { in: responseIds },
      },
    });

    // 3. Delete ResponseArtifacts (references Response)
    await prisma.responseArtifact.deleteMany({
      where: {
        responseId: { in: responseIds },
      },
    });

    // 4. Delete Responses
    await prisma.response.deleteMany({
      where: {
        attemptId: { in: attemptIds },
      },
    });
  }

  // 5. Delete section progress
  await prisma.attemptSection.deleteMany({
    where: {
      attemptId: { in: attemptIds },
    },
  });

  // 6. Delete attempts
  const result = await prisma.attempt.deleteMany({
    where: whereClause,
  });

  return {
    deletedCount: result.count,
    message: `Successfully reset ${result.count} attempt(s)`,
  };
};

type ResumeAttemptsInput = z.infer<typeof resumeAttemptsSchema>['body'];

export const resumeAttempts = async (input: ResumeAttemptsInput) => {
  const { examId, studentIds, resumeAll } = input;

  // Verify exam exists
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: { id: true, title: true },
  });

  if (!exam) {
    throw { status: 404, message: 'Exam not found' };
  }

  // Build where clause for attempts to resume
  const whereClause: Prisma.AttemptWhereInput = {
    examId: examId,
    status: AttemptStatus.SUBMITTED,
    // submissionType: 'AUTO', // Allow resuming manual submissions too (per user request)
  };

  if (!resumeAll && studentIds && studentIds.length > 0) {
    whereClause.studentId = { in: studentIds };
  }

  // Get all attempts to resume
  const attemptsToResume = await prisma.attempt.findMany({
    where: whereClause,
    select: { id: true },
  });

  const attemptIds = attemptsToResume.map(a => a.id);

  if (attemptIds.length === 0) {
    return {
      resumedCount: 0,
      message: 'No auto-submitted attempts found to resume',
    };
  }

  // Resume attempts: change status back to IN_PROGRESS, clear submittedAt, and update startedAt to preserve time spent
  // We need to calculate a new "startedAt" such that (now - newStartedAt) = previousTimeSpent
  // This ensures the timer continues from where it left off

  let resumedCount = 0;
  const now = new Date();

  // We need to fetch the timeSpentSec for each attempt to calculate the new startedAt
  // We already have attemptIds (which are just IDs), let's fetch the full attempts
  const attemptsWithData = await prisma.attempt.findMany({
    where: { id: { in: attemptIds } },
    select: { id: true, timeSpentSec: true },
  });

  // Update attempts individually (or in batch if we could, but startedAt differs per attempt)
  // Since this is an admin action for specific students, sequential updates are acceptable
  for (const attempt of attemptsWithData) {
    const timeSpentMs = (attempt.timeSpentSec || 0) * 1000;
    const newStartedAt = new Date(now.getTime() - timeSpentMs);

    await prisma.attempt.update({
      where: { id: attempt.id },
      data: {
        status: AttemptStatus.IN_PROGRESS,
        submittedAt: null,
        startedAt: newStartedAt, // Backdate startedAt so elapsed time matches timeSpentSec
        submissionType: 'NORMAL',
        submissionReason: null,
      },
    });
    resumedCount++;
  }

  return {
    resumedCount,
    message: `Successfully resumed ${resumedCount} attempt(s)`,
  };
};

export const runCode = async (
  studentId: string,
  attemptId: string,
  questionId: string,
  code: string,
  language: string,
  customInput?: string,
  runAllTests?: boolean
) => {
  // 1. Verify attempt
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    select: { studentId: true, examId: true, status: true },
  });

  if (!attempt) {
    throw { status: 404, message: 'Attempt not found' };
  }
  if (attempt.studentId !== studentId) {
    throw { status: 403, message: 'Forbidden' };
  }

  // 2. Get question
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { id: true, type: true, testcases: true },
  });

  if (!question) {
    throw { status: 404, message: 'Question not found' };
  }
  if (question.type !== QType.CODING) {
    throw { status: 400, message: 'Not a coding question' };
  }

  // 3. Execute code
  if (customInput !== undefined) {
    // Run with custom input (even if empty string - user wants to test with empty input)
    const result = await executeCodeLocally(code, language, customInput);
    return {
      passed: result.status.id === 3 ? 1 : 0,
      total: 1,
      testResults: [{
        input: customInput,
        expectedOutput: '(Custom Input)',
        actualOutput: result.stdout,
        passed: result.status.id === 3,
        status: result.status.description,
        error: result.stderr || result.error
      }],
      message: result.stderr ? 'Execution Error' : 'Execution Successful'
    };
  } else {
    // Run with test cases
    const testCases = (question.testcases as any[]) || [];
    // If runAllTests is true (submit mode), run all. Otherwise only visible ones.
    const testsToRun = runAllTests ? testCases : testCases.filter(tc => !tc.isHidden);

    // Map test cases with metadata (isHidden, originalIndex) for proper display
    const testsWithMetadata = testsToRun.map((tc, idx) => ({
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      timeoutMs: tc.timeoutMs,
      isHidden: tc.isHidden || false,
      originalIndex: runAllTests ? testCases.findIndex(origTc => origTc === tc) : idx,
    }));

    const results = await testCodeWithTestCasesLocally(code, language, testsWithMetadata);
    return {
      passed: results.passed,
      total: results.total,
      testResults: results.results,
      message: results.passed === results.total ? 'All tests passed' : `${results.passed}/${results.total} tests passed`
    };
  }
};