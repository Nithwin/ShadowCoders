import * as attemptRepo from "./attempt.repo";
import { Prisma, ExamStatus, AttemptStatus, QType, GradingMode } from "@prisma/client";
import { shuffleArray } from "../../lib/utils";
import { prisma } from "../../lib/prisma";
import z from "zod";
import { listAttemptsSchema, submitAnswerSchema, resetAttemptsSchema } from "./attempt.zod";
import * as userRepo from "../auth/auth.repo";

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

  if (attempt.status !== AttemptStatus.IN_PROGRESS) {
    throw {
      status: 403,
      message: "Cannot submit answer to a completed or submitted attempt",
    };
  }

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { examId: true, type: true },
  });

  if (!question) {
    throw { status: 404, message: "Question not found" };
  }
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
};


const areArraysEqual = (arr1: any[], arr2: any[]): boolean => {
  if (arr1.length !== arr2.length) return false;
  const sortedArr1 = [...arr1].sort();
  const sortedArr2 = [...arr2].sort();
  return sortedArr1.every((value, index) => value === sortedArr2[index]);
};

export const submitAttempt = async (studentId: string, attemptId: string) => {
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

    if (response && response.answer) {
      // Auto-grade based on question type
      switch (question.type) {
        case QType.MCQ:
          try {
            // Safely parse the JSON answer and correct answer
            const answer = response.answer as { chosenOptionIds: string[] };
            const correct = question.correctOptionIds as string[];

            if (answer.chosenOptionIds && correct) {
              const isCorrect = areArraysEqual(answer.chosenOptionIds, correct);
              if (isCorrect) {
                totalScore += questionPoints;
                
                // Update the response's earnedPoints in the database
                await prisma.response.updateMany({
                  where: {
                    attemptId: attemptId,
                    questionId: question.id,
                  },
                  data: {
                    earnedPoints: questionPoints,
                    verdict: 'PASS',
                    gradingMode: GradingMode.AUTO,
                  },
                });
              } else {
                // Update response to indicate incorrect answer
                await prisma.response.updateMany({
                  where: {
                    attemptId: attemptId,
                    questionId: question.id,
                  },
                  data: {
                    earnedPoints: 0,
                    verdict: 'FAIL',
                    gradingMode: GradingMode.AUTO,
                  },
                });
              }
              // You could add logic for negative marking here
            }
          } catch (e) {
            // Failed to auto-grade MCQ; skip and continue. Details: removed debug logging.
          }
          break;

        case QType.CODING:
          // Auto-grade coding questions using test cases
          try {
            const answer = response.answer as { code?: string; language?: string };
            const testcases = question.testcases as Array<{ input: string; expectedOutput: string; isHidden?: boolean; timeoutMs?: number }> | null;
            
            if (answer?.code && testcases && testcases.length > 0) {
              const code = answer.code.trim();
              const language = answer.language || 'javascript';
              
              if (code.length === 0) {
                // No code provided
                await prisma.response.updateMany({
                  where: {
                    attemptId: attemptId,
                    questionId: question.id,
                  },
                  data: {
                    earnedPoints: 0,
                    verdict: 'FAIL',
                    gradingMode: GradingMode.AUTO,
                  },
                });
                break;
              }

              // Execute code against ALL test cases (both visible and hidden)
              const { testCodeWithTestCases } = await import('../../lib/judge0');
              
              const testResults = await testCodeWithTestCases(
                code,
                language,
                testcases.map((tc) => ({
                  input: tc.input,
                  expectedOutput: tc.expectedOutput,
                  timeoutMs: tc.timeoutMs || 2000,
                }))
              );

              // Calculate score based on test cases passed
              // Score = (passed / total) * questionPoints
              const passedRatio = testResults.total > 0 ? testResults.passed / testResults.total : 0;
              const earnedPoints = Math.round(questionPoints * passedRatio * 100) / 100; // Round to 2 decimal places
              
              totalScore += earnedPoints;
              
              // Update the response's earnedPoints in the database
              await prisma.response.updateMany({
                where: {
                  attemptId: attemptId,
                  questionId: question.id,
                },
                data: {
                  earnedPoints: earnedPoints,
                  verdict: testResults.passed === testResults.total ? 'PASS' : 'PARTIAL',
                  gradingMode: GradingMode.AUTO,
                },
              });
            } else if (!answer?.code || answer.code.trim().length === 0) {
              // No code provided
              await prisma.response.updateMany({
                where: {
                  attemptId: attemptId,
                  questionId: question.id,
                },
                data: {
                  earnedPoints: 0,
                  verdict: 'FAIL',
                  gradingMode: GradingMode.AUTO,
                },
              });
            }
          } catch (e) {
            // Failed to auto-grade coding; give 0 points
            console.error('Error auto-grading coding question:', e);
            await prisma.response.updateMany({
              where: {
                attemptId: attemptId,
                questionId: question.id,
              },
              data: {
                earnedPoints: 0,
                verdict: 'FAIL',
                gradingMode: GradingMode.AUTO,
              },
            });
          }
          break;
          
        case QType.ESSAY:
        case QType.SPEAKING:
          // These types require manual grading, so score 0 for now
          // The 'earnedPoints' on the Response can be updated later by a STAFF user
          totalScore += 0;
          break;
        
        // Add other auto-gradable types (like FILL) here
        default:
          totalScore += 0;
      }
    }
  }

  // 4. --- Update the Attempt in the Database ---
  const submittedAttempt = await attemptRepo.updateAttemptOnSubmit(
    attemptId,
    totalScore,
    maxScore
  );

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
    testcases: question.type === QType.CODING && question.testcases
      ? (question.testcases as any[]).filter((tc: any) => !tc.isHidden)
      : undefined,
  };

  return scrubbedQuestion;
};

export const getAttemptResults = async (
  studentId: string,
  attemptId: string
) => {
  // 1. Fetch all result data from the repository
  const attemptResults = await attemptRepo.getAttemptResults(attemptId);

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

  // 5. Sort responses by question order for consistent display
  if (attemptResults.responses && Array.isArray(attemptResults.responses)) {
    attemptResults.responses.sort((a: any, b: any) => {
      const orderA = a.question?.order ?? 999;
      const orderB = b.question?.order ?? 999;
      return orderA - orderB;
    });
  }

  // 6. Return the full results
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

  // 1. Call the repository to get attempts and the total count
  const { attempts, totalCount } = await attemptRepo.listAttemptsForExam({
    examId,
    page,
    pageSize,
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