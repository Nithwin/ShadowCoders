import * as attemptRepo from "./attempt.repo";
import { Prisma, ExamStatus, AttemptStatus, QType, GradingMode } from "@prisma/client";
import { shuffleArray } from "../../lib/utils";
import { prisma } from "../../lib/prisma";
import z from "zod";
import { listAttemptsSchema, submitAnswerSchema, resetAttemptsSchema } from "./attempt.zod";
import * as userRepo from "../auth/auth.repo";
import { gradeMCQ, gradeCoding } from "../grading/grading.logic";
import { executeCodeLocally, testCodeWithTestCasesLocally } from "../../lib/local-executor";

export const startAttempt = async (studentId: string, examId: string) => {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      assignments: true,
      questions: { select: { id: true } },
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
  return await prisma.$transaction(async (tx) => {
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
    if (exam.randomizeQuestions && exam.questions.length > 0) {
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
};

type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>["body"];

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

      const responseData: Parameters<typeof attemptRepo.upsertResponse>[0] = {
        attemptId: attemptId,
        questionId: questionId,
        answer: answer ? (answer as Prisma.InputJsonValue) : Prisma.JsonNull,
        type: question.type,
        ...(audioAssetId && { audioAssetId }),
      };
      const savedResponse = await attemptRepo.upsertResponse(responseData);

      return savedResponse;
    },
    priority
  );
};

export const submitAttempt = async (studentId: string, attemptId: string, submissionReason?: string) => {
  // 1. Fetch all data needed for grading
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

  let totalScore = 0;
  let maxScore = 0;


  for (const question of attempt.exam.questions) {
    // Add question's points to the max possible score
    // Convert Decimal to number for calculation
    const questionPoints = Number(question.points);
    maxScore += questionPoints;

    // Find the student's response for this question
    const response = attempt.responses.find((r) => r.questionId === question.id);

    // CHECK FOR FORCE FULL MARKS OVERRIDE via Question Config
    const config = (question as any).config;
    if (config && config.forceFullMarks === true) {
        // Award full points regardless of answer
        totalScore += questionPoints;
        
        // If response exists, update it to reflect full marks
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
        continue; // Skip normal grading logic
    }

    if (response && response.answer) {
      // Auto-grade based on question type
      let gradingResult: {
        earnedPoints: number;
        verdict: string;
        gradingMode: GradingMode;
      } = {
        earnedPoints: 0,
        verdict: 'FAIL',
        gradingMode: GradingMode.MANUAL, // Default to manual if not auto-graded
      };

      switch (question.type) {
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
          
        case QType.ESSAY:
        case QType.SPEAKING:
          // Manual grading required
          gradingResult = {
            earnedPoints: 0,
            verdict: 'PENDING', // Or FAIL/PASS based on policy, usually PENDING for manual
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

      // Update total score if auto-graded
      if (gradingResult.gradingMode === GradingMode.AUTO) {
        totalScore += gradingResult.earnedPoints;
      }

      // Update the response in the database
      // Only update if we actually have a result (even 0 points)
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

  // 4. --- Update the Attempt in the Database ---
  // Determine submission type
  const submissionType = submissionReason ? 'AUTO' : 'NORMAL';

  const submittedAttempt = await prisma.attempt.update({
    where: { id: attemptId },
    data: {
      status: AttemptStatus.SUBMITTED,
      submittedAt: new Date(),
      score: totalScore,
      maxScore: maxScore,
      submissionType: submissionType,
      submissionReason: submissionReason || null,
      // Calculate time spent
      timeSpentSec: Math.floor((new Date().getTime() - new Date(attempt.startedAt).getTime()) / 1000),
    },
  });

  // Points are now awarded manually by admin from the submissions page
  // No automatic points awarding on submission

  return submittedAttempt;
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
      let gradingResult: {
        earnedPoints: number;
        verdict: string;
        gradingMode: GradingMode;
      } = {
        earnedPoints: 0,
        verdict: 'FAIL',
        gradingMode: GradingMode.MANUAL,
      };

      switch (question.type) {
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

  // 7. Return the full results
  return attemptResults;
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

  // Build where clause for attempts to delete
  const whereClause: Prisma.AttemptWhereInput = {
    examId: examId,
    status: AttemptStatus.SUBMITTED, // Only delete submitted attempts
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
      message: 'No submitted attempts found to reset',
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