import { AttemptStatus, Prisma, QType } from "@prisma/client";
import { prisma } from "../../lib/prisma";


export const createAttempt = (data: Prisma.AttemptCreateInput) => {
    return prisma.attempt.create({
        data,
        select:{
            id:true,
            examId:true,
            studentId:true,
            startedAt:true,
            status:true,
            orderMap:true,
            attemptNo:true,
        }
    })
}

export const upsertResponse = async (data: {
  attemptId: string;
  questionId: string;
  type: QType;
  answer: Prisma.InputJsonValue | Prisma.NullTypes.JsonNull;
  audioAssetId?: string;
}) => {
  const { attemptId, questionId, type, answer, audioAssetId, ...otherData } = data;

  // Check if response already exists
  const existing = await prisma.response.findFirst({
    where: {
      attemptId: attemptId,
      questionId: questionId,
    },
  });

  const updateData: Prisma.ResponseUpdateInput = {
    answer: answer,
    ...otherData,
  };
  if (audioAssetId !== undefined) {
    updateData.audioAsset = audioAssetId ? { connect: { id: audioAssetId } } : { disconnect: true };
  }

  if (existing) {
    // Update existing response
    return prisma.response.update({
      where: { id: existing.id },
      data: updateData,
    });
  } else {
    // Create new response
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
    return prisma.response.create({
      data: createData,
    });
  }
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
    where:{id: attemptId},
    select : {
      id:true,
      studentId:true,
      status:true,
      examId:true,
      responses : {
        select: {
          questionId:true,
          answer:true,
          type:true,
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
}) => {
  const { examId, page, pageSize } = params;

  // Ensure pageSize and page are numbers
  const pageSizeNum = typeof pageSize === 'string' ? parseInt(pageSize, 10) : Number(pageSize);
  const pageNum = typeof page === 'string' ? parseInt(page, 10) : Number(page);

  // Calculate skip for pagination
  const skip = (pageNum - 1) * pageSizeNum;

  // 1. Fetch the paginated list of attempts
  const attempts = await prisma.attempt.findMany({
    where: {
      examId: examId,
      // You could add filters here later, e.g., status: AttemptStatus.SUBMITTED
    },
    select: {
      id: true,
      status: true,
      score: true,
      maxScore: true,
      startedAt: true,
      submittedAt: true,
      student: {
        // Include relevant student info for the admin list
        select: {
          id: true,
          name: true,
          email: true,
          reg_no: true,
        },
      },
    },
    orderBy: {
      submittedAt: 'desc', // Show most recently submitted first
    },
    skip: skip,
    take: pageSizeNum,
  });

  // 2. Fetch the total count of attempts for that exam
  const totalCount = await prisma.attempt.count({
    where: {
      examId: examId,
    },
  });

  return { attempts, totalCount };
};

export const getStudentAttempts = async (studentId: string) => {
  return prisma.attempt.findMany({
    where: {
      studentId: studentId,
      status: AttemptStatus.SUBMITTED, // Only get submitted attempts
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
    },
    orderBy: {
      submittedAt: 'desc', // Show most recently submitted first
    },
  });
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
      exam: {
        select: {
          id: true,
          title: true,
          maxAttempts: true,
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