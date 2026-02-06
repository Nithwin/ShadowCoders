import { AttemptStatus, Prisma, QType } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { retryWithBackoff } from "../../lib/utils/retry";


export const createAttempt = (data: Prisma.AttemptCreateInput) => {
  return prisma.attempt.create({
    data,
    select: {
      id: true,
      examId: true,
      studentId: true,
      startedAt: true,
      status: true,
      orderMap: true,
      attemptNo: true,
    }
  })
}

export const upsertResponse = async (data: {
  attemptId: string;
  questionId: string;
  type: QType;
  answer: Prisma.InputJsonValue | Prisma.NullTypes.JsonNull;
  audioAssetId?: string;
  earnedPoints?: number;
  verdict?: string;
  gradingMode?: any;
}) => {
  const { attemptId, questionId, type, answer, audioAssetId, ...otherData } = data;

  // Use Prisma's native upsert to handle race conditions
  const updateData: Prisma.ResponseUpdateInput = {
    answer: answer,
    ...otherData,
  };

  if (audioAssetId !== undefined) {
    updateData.audioAsset = audioAssetId ? { connect: { id: audioAssetId } } : { disconnect: true };
  }

  const createData: Prisma.ResponseCreateInput = {
    attempt: { connect: { id: attemptId } },
    question: { connect: { id: questionId } },
    type: type,
    answer: answer,
    ...otherData,
  };

  if (audioAssetId) {
    createData.audioAsset = { connect: { id: audioAssetId } };
  }

  // Use retry with exponential backoff to handle race conditions
  // When multiple requests come in simultaneously, retry will handle the unique constraint error
  return retryWithBackoff(
    () => prisma.response.upsert({
      where: {
        attemptId_questionId: {
          attemptId: attemptId,
          questionId: questionId,
        },
      },
      update: updateData,
      create: createData,
    }),
    {
      maxRetries: 5,
      initialDelay: 50,
      maxDelay: 500,
      retryableErrors: ['P2002'], // Unique constraint violation
    }
  );
};

export const getAttemptDetails = (attemptId: string) => {
  return prisma.attempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      studentId: true,
      status: true,
      examId: true,
      startedAt: true,
      submittedAt: true,
      score: true,
      maxScore: true,
      orderMap: true, // Required for dynamic exams
      responses: {
        select: {
          questionId: true,
          answer: true,
          type: true,
          earnedPoints: true,
          verdict: true,
          feedback: true,
        },
      },
      exam: {
        select: {
          id: true,
          title: true,
          durationMins: true,
          allowedLanguages: true,
          maxAttempts: true,
          mode: true, // Required for dynamic exams
          dynamicQuestionCount: true, // Required for dynamic exams
          enableProctoring: true, // Required for AI proctoring
          maxTabSwitches: true, // Required for tab switch detection
          questions: {
            select: {
              id: true,
              order: true,
            },
            orderBy: {
              order: 'asc',
            },
          },
          sections: {
            select: {
              id: true,
              title: true,
              order: true,
              sectionQuestions: {
                select: {
                  questionId: true,
                  question: {
                    select: {
                      id: true,
                      order: true,
                    },
                  },
                },
                orderBy: {
                  order: 'asc',
                },
              },
            },
            orderBy: {
              order: 'asc',
            },
          },
        },
      },
    },
  });
};

export const getAttemptForSubmission = (attemptId: string) => {
  return prisma.attempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      studentId: true,
      status: true,
      examId: true,
      startedAt: true,
      responses: {
        select: {
          questionId: true,
          answer: true,
          type: true,
          earnedPoints: true,
          verdict: true,
          gradingMode: true,
        },
      },
      exam: {
        select: {
          questions: {
            select: {
              id: true,
              type: true,
              points: true,
              correctOptionIds: true,
              testcases: true,
              config: true,
            },
          },
        },
      },
    }
  })
}

export const updateAttemptOnSubmit = (
  attemptId: string,
  score: number,
  maxScore: number
) => {
  return prisma.attempt.update({
    where: { id: attemptId },
    data: {
      status: AttemptStatus.SUBMITTED,
      submittedAt: new Date(),
      score: score,
      maxScore: maxScore,
    },
    select: {
      id: true,
      studentId: true, // For verification
      status: true,
      score: true,
      maxScore: true,
      startedAt: true,
      submittedAt: true,
      exam: {
        select: {
          title: true,
        },
      },
      // Get all responses
      responses: {
        select: {
          questionId: true,
          answer: true,
          earnedPoints: true,
          feedback: true,
          verdict: true,
          // Include question details for display
          question: {
            select: {
              id: true,
              type: true,
              prompt: true,
              points: true,
              order: true,
            },
          },
          // Get all evaluations (from AI or Staff) for each response
          evaluations: {
            select: {
              kind: true,
              score: true,
              comments: true,
              breakdown: true,
              isFinal: true,
            },
            where: { isFinal: true }, // Only fetch the final, published evaluation
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      },
    },
  });
};

export const listAttemptsForExam = async (params: {
  examId: string;
  page: number;
  pageSize: number;
  searchQuery?: string;
}) => {
  const { examId, page, pageSize, searchQuery } = params;

  // Ensure pageSize and page are numbers
  const pageSizeNum = typeof pageSize === 'string' ? parseInt(pageSize, 10) : Number(pageSize);
  const pageNum = typeof page === 'string' ? parseInt(page, 10) : Number(page);

  // Calculate skip for pagination
  const skip = (pageNum - 1) * pageSizeNum;

  // Strategy: Get the latest attempt per student
  // We'll use a subquery to find the max attemptNo for each student, then fetch those attempts

  // 1. If search is provided, first find matching students by name, email, or reg_no
  let studentIds: string[] | undefined = undefined;
  if (searchQuery && searchQuery.trim()) {
    const searchTerm = searchQuery.trim();

    // Build OR conditions for search - handle null values properly
    const searchConditions: Prisma.UserWhereInput[] = [
      // Search name only if it's not null
      {
        AND: [
          { name: { not: null } },
          { name: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      // Email is required, so no null check needed
      { email: { contains: searchTerm, mode: 'insensitive' } },
      // Search reg_no only if it's not null
      {
        AND: [
          { reg_no: { not: null } },
          { reg_no: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
    ];

    const matchingStudents = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        OR: searchConditions,
      },
      select: { id: true, name: true, email: true, reg_no: true },
    });

    studentIds = matchingStudents.map(s => s.id);

    // If no students match the search, return empty results early
    if (studentIds.length === 0) {
      return { attempts: [], totalCount: 0 };
    }
  }

  // 2. Get all unique students who have attempted this exam with their latest attemptNo
  // If search is provided, only get attempts for matching students
  const latestAttempts = await prisma.attempt.groupBy({
    by: ['studentId'],
    where: {
      examId: examId,
      ...(studentIds ? { studentId: { in: studentIds } } : {}),
    },
    _max: {
      attemptNo: true,
    },
  });

  // If no attempts found (after search filter), return empty results
  if (latestAttempts.length === 0) {
    return { attempts: [], totalCount: 0 };
  }

  // 3. Now fetch the full attempt details for these latest attempts
  const attempts = await prisma.attempt.findMany({
    where: {
      examId: examId,
      OR: latestAttempts.map(la => ({
        studentId: la.studentId,
        attemptNo: la._max.attemptNo || 1,
      })),
    },
    select: {
      id: true,
      status: true,
      score: true,
      maxScore: true,
      startedAt: true,
      submittedAt: true,
      attemptNo: true,
      submissionType: true,
      submissionReason: true,
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          reg_no: true,
        },
      },
      responses: {
        select: {
          earnedPoints: true,
        },
      },
    },
    orderBy: {
      submittedAt: 'desc',
    },
    skip: skip,
    take: pageSizeNum,
  });

  // 3. Recalculate scores from responses to ensure accuracy
  const attemptsWithCorrectScores = attempts.map(attempt => {
    const calculatedScore = attempt.responses.reduce((sum, response) => {
      return sum + (response.earnedPoints ? parseFloat(String(response.earnedPoints)) : 0);
    }, 0);

    // Return attempt without responses (to match original API contract)
    const { responses, ...attemptWithoutResponses } = attempt;

    return {
      ...attemptWithoutResponses,
      score: calculatedScore, // Override with calculated score
    };
  });

  // 4. Total count is the number of unique students who attempted (after search filter)
  // latestAttempts already contains only the matching students if search was applied
  const totalCount = latestAttempts.length;

  return { attempts: attemptsWithCorrectScores, totalCount };
};

export const getStudentAttempts = async (studentId: string) => {
  // Strategy: Get the latest attempt per exam for this student
  // Similar to listAttemptsForExam, but grouped by examId instead of studentId

  // 1. First, get all unique exams this student has attempted with their latest attemptNo
  const latestAttempts = await prisma.attempt.groupBy({
    by: ['examId'],
    where: {
      studentId: studentId,
      status: AttemptStatus.SUBMITTED,
    },
    _max: {
      attemptNo: true,
    },
  });

  // 2. Now fetch the full attempt details for these latest attempts
  const attempts = await prisma.attempt.findMany({
    where: {
      studentId: studentId,
      status: AttemptStatus.SUBMITTED,
      OR: latestAttempts.map(la => ({
        examId: la.examId,
        attemptNo: la._max.attemptNo || 1,
      })),
    },
    select: {
      id: true,
      status: true,
      score: true,
      maxScore: true,
      startedAt: true,
      submittedAt: true,
      exam: {
        select: {
          id: true,
          title: true,
        },
      },
      responses: {
        select: {
          earnedPoints: true,
        },
      },
    },
    orderBy: {
      submittedAt: 'desc',
    },
  });

  // 3. Recalculate scores from responses to ensure accuracy
  // The stored score might be stale after admin grade overrides
  const attemptsWithCorrectScores = attempts.map(attempt => {
    const calculatedScore = attempt.responses.reduce((sum, response) => {
      return sum + (response.earnedPoints ? parseFloat(String(response.earnedPoints)) : 0);
    }, 0);

    // Return attempt without responses (to match original API contract)
    const { responses, ...attemptWithoutResponses } = attempt;

    return {
      ...attemptWithoutResponses,
      score: calculatedScore, // Override with calculated score
    };
  });

  return attemptsWithCorrectScores;
};

export const getFullAttemptForAdmin = (attemptId: string) => {
  return prisma.attempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      status: true,
      score: true,
      maxScore: true,
      startedAt: true,
      submittedAt: true,
      submissionType: true,
      submissionReason: true,
      // Get student info
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          reg_no: true,
        },
      },
      // Get exam info
      exam: {
        select: {
          id: true,
          title: true,
        },
      },
      // Get all responses
      responses: {
        select: {
          id: true,
          answer: true,
          verdict: true,
          earnedPoints: true,
          feedback: true,
          // Include audioAsset for SPEAKING questions
          audioAsset: {
            select: {
              id: true,
              url: true,
              kind: true,
            },
          },
          // Get the original question for context
          question: {
            select: {
              id: true,
              type: true,
              prompt: true,
              points: true,
              order: true,
              // Include answer-related fields for admin review
              options: true,
              correctOptionIds: true,
              testcases: true,
              blanks: true,
              starterCode: true,
              wordLimit: true,
            },
          },
          // Get all evaluations (manual or AI) for this response
          evaluations: {
            select: {
              id: true,
              kind: true,
              score: true,
              comments: true,
              breakdown: true,
              isFinal: true,
              assessor: {
                select: {
                  id: true,
                  name: true,
                  role: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc', // Show newest evaluations first
            },
          },
        },
        orderBy: {
          // You could order responses by question order
          // This requires a more complex query or sorting in service
          createdAt: 'asc',
        },
      },
    },
  });
};

export const getAttemptResults = (attemptId: string) => {
  return prisma.attempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      studentId: true,
      status: true,
      score: true,
      maxScore: true,
      startedAt: true,
      submittedAt: true,
      submissionType: true,
      submissionReason: true,
      exam: {
        select: {
          id: true,
          title: true,
          maxAttempts: true,
          releaseResults: true,
          questions: {
            select: {
              id: true,
              type: true,
              prompt: true,
              points: true,
              order: true,
              options: true,
              correctOptionIds: true,
              testcases: true,
              blanks: true,
              starterCode: true,
            },
            orderBy: {
              order: 'asc',
            },
          },
        },
      },
      responses: {
        select: {
          id: true,
          questionId: true,
          answer: true,
          earnedPoints: true,
          verdict: true,
          feedback: true,
          question: {
            select: {
              id: true,
              type: true,
              prompt: true,
              points: true,
              order: true,
              options: true,
              correctOptionIds: true,
              testcases: true,
              blanks: true,
              starterCode: true,
            },
          },
          evaluations: {
            select: {
              id: true,
              kind: true,
              score: true,
              comments: true,
              breakdown: true,
              isFinal: true,
            },
            where: { isFinal: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      },
    },
  });
};
