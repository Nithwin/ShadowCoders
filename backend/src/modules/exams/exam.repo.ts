import { ExamStatus, Prisma, User } from "@prisma/client";
import { prisma } from "../../lib/prisma";

export const createExam = (data: Prisma.ExamCreateInput) => {
  return prisma.exam.create({
    data: data,
  });
};

export const createExamAssignment = (
  examId: string,
  assignmentData: Omit<Prisma.ExamAssignmentCreateManyInput, "examId">
) => {
  return prisma.examAssignment.create({
    data: {
      ...assignmentData,
      exam: {
        connect: { id: examId },
      },
    },
  });
};

export const updateExamStatus = (examId: string, status: ExamStatus) => {
  return prisma.exam.update({
    where: { id: examId },
    data: { status },
  });
};

export const findExamById = (examId: string) => {
  return prisma.exam.findUnique({
    where: { id: examId },
    include: {
      sections: {
        include: {
          sectionQuestions: {
            include: {
              question: {
                select: {
                  id: true,
                  type: true,
                  prompt: true,
                  points: true,
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
      assignments: true,
      _count: {
        select: {
          questions: true,
          sections: true,
          attempts: true,
        },
      },
    },
  });
};

export const listExams = async (params: {
  status?: ExamStatus;
  searchQuery?: string;
  page: number;
  pageSize: number;
}) => {
  const { status, searchQuery, page, pageSize } = params;

  const skip = (page - 1) * pageSize;

  const whereClause: Prisma.ExamWhereInput = {};
  if (status) {
    whereClause.status = status;
  }
  if (searchQuery) {
    whereClause.OR = [
      { title: { contains: searchQuery, mode: "insensitive" } },
      { description: { contains: searchQuery, mode: "insensitive" } },
    ];
  }

  const exams = await prisma.exam.findMany({
    where: whereClause,
    skip: skip,
    take: pageSize,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      startAt: true,
      endAt: true,
      durationMins: true,
      status: true,
      timingMode: true,
      sectionLockPolicy: true,
      randomizeQuestions: true,
      negativeMarkPerWrong: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          questions: true,
          sections: true,
          attempts: true,
        },
      },
    },
  });

  const totalCount = await prisma.exam.count({
    where: whereClause,
  });

  return {
    exams,
    totalCount,
  };
};

export const findExamByIdForStudent = async (params: {
  examId: string;
  student: Pick<User, "id" | "year" | "department" | "section">;
}) => {
  const { examId, student } = params;
  const whereClause: Prisma.ExamWhereInput = {
    id: examId,
    // Must be published
    status: ExamStatus.PUBLISHED,
    // Filter by assignment
    assignments: {
      some: {
        OR: [
          // Condition 1: Assigned to all students
          {
            assignToAll: true,
          },
          // Condition 2: Assigned via cohort match (only if student has cohort info)
          ...(student.year && student.department && student.section
            ? [
                {
                  cohortYear: student.year,
                  cohortDepartment: student.department,
                  cohortSection: student.section,
                },
              ]
            : []),
          // Condition 3: Assigned directly via student ID
          {
            studentIds: {
              path: ["$"],
              array_contains: student.id,
            },
          },
        ],
      },
    },
  };

  // Fetch the exam with attempt status and question types
  const exam = await prisma.exam.findFirst({
    where: whereClause,
    select: {
      id: true,
      title: true,
      description: true,
      startAt: true,
      endAt: true,
      durationMins: true,
      status: true,
      allowedLanguages: true, // Include allowed languages for coding questions
      maxAttempts: true, // Include maxAttempts
      // Include attempts to check if student has completed this exam
      attempts: {
        where: {
          studentId: student.id,
          status: 'SUBMITTED',
        },
        select: {
          id: true,
          status: true,
          submittedAt: true,
        },
        take: 1,
      },
      // Include question types to check if exam has speaking questions
      questions: {
        select: {
          type: true,
        },
        distinct: ['type'],
      },
      // Count attempts
      _count: {
        select: {
          attempts: {
            where: {
              studentId: student.id,
            },
          },
        },
      },
    },
  });

  if (!exam) {
    return null;
  }

  // Transform to include attempt status and question types
  const hasCompletedAttempt = exam.attempts && exam.attempts.length > 0;
  const { attempts, questions, _count, ...examData } = exam;
  
  // Extract unique question types
  const questionTypes = questions ? [...new Set(questions.map(q => q.type))] : [];
  const hasSpeakingQuestions = questionTypes.includes('SPEAKING');
  
  return {
    ...examData,
    hasAttempt: hasCompletedAttempt,
    attemptId: hasCompletedAttempt ? exam.attempts[0]!.id : null,
    questionTypes,
    hasSpeakingQuestions,
    attemptCount: _count.attempts,
  };
};

export const listExamsForStudent = async (params: {
  student: Pick<User, "id" | "year" | "department" | "section">; // Pass relevant student details
  filter?: "UPCOMING" | "LIVE" | "COMPLETED";
  searchQuery?: string;
  page: number;
  pageSize: number;
}) => {
  const { student, filter, searchQuery, page, pageSize } = params;
  const now = new Date();
  const skip = (page - 1) * pageSize;
  
  // Base where clause - must be published and assigned
  const baseWhereClause: Prisma.ExamWhereInput = {
    // Must be published
    status: ExamStatus.PUBLISHED,
    // Filter by search query (title/description)
    ...(searchQuery && {
      OR: [
        { title: { contains: searchQuery, mode: "insensitive" } },
        { description: { contains: searchQuery, mode: "insensitive" } },
      ],
    }),
    // Filter by assignment
    assignments: {
      some: {
        OR: [
          // Condition 1: Assigned to all students
          {
            assignToAll: true,
          },
          // Condition 2: Assigned via cohort match (only if student has cohort info)
          ...(student.year && student.department && student.section
            ? [
                {
                  cohortYear: student.year,
                  cohortDepartment: student.department,
                  cohortSection: student.section,
                },
              ]
            : []),
          // Condition 3: Assigned directly via student ID
          {
            studentIds: {
              path: ["$"],
              array_contains: student.id,
            },
          },
        ],
      },
    },
  };

  // Build filter-specific where clause
  let whereClause: Prisma.ExamWhereInput = { ...baseWhereClause };

  if (filter === "UPCOMING") {
    // UPCOMING: Exams that haven't started yet AND student hasn't submitted an attempt
    whereClause = {
      ...baseWhereClause,
      startAt: { gt: now },
      // Exclude exams where student has submitted attempts
      attempts: {
        none: {
          studentId: student.id,
          status: 'SUBMITTED',
        },
      },
    };
  } else if (filter === "LIVE") {
    // LIVE: Exams that are currently active
    // Show exams where student can still attempt (either no attempts, or has attempts but can retake based on maxAttempts)
    // We can't filter by maxAttempts in Prisma easily, so we'll fetch all live exams and filter in the service
    whereClause = {
      ...baseWhereClause,
      startAt: { lte: now },
      endAt: { gt: now },
    };
  } else if (filter === "COMPLETED") {
    // COMPLETED: Exams that have ended OR student has submitted an attempt
    whereClause = {
      ...baseWhereClause,
      OR: [
        // Option 1: Exam has ended
        { endAt: { lte: now } },
        // Option 2: Student has submitted an attempt (regardless of exam end time)
        {
          attempts: {
            some: {
              studentId: student.id,
              status: 'SUBMITTED',
            },
          },
        },
      ],
    };
  }

  // Fetch the exams for the current page
  const exams = await prisma.exam.findMany({
    where: whereClause,
    skip: skip,
    take: pageSize,
    orderBy: {
      startAt: filter === "COMPLETED" ? "desc" : "asc", // Show completed newest first, others oldest first
    },
    // Select only needed fields
    select: {
      id: true,
      title: true,
      description: true,
      startAt: true,
      endAt: true,
      durationMins: true,
      status: true,
      maxAttempts: true,
      // Include ALL attempts (not just SUBMITTED) to get the latest attempt
      attempts: {
        where: {
          studentId: student.id,
        },
        select: {
          id: true,
          status: true,
          submittedAt: true,
          attemptNo: true,
          score: true,
          maxScore: true,
        },
        orderBy: {
          attemptNo: 'desc', // Get the latest attempt first
        },
        take: 1, // Only get the latest attempt
      },
    },
  });

  // Fetch the total count matching the filters
  const totalCount = await prisma.exam.count({
    where: whereClause,
  });

  return { exams, totalCount };
};

export const updateExam = (
  examId: string,
  data: Prisma.ExamUpdateInput // Use the generic update input type
) => {
  return prisma.exam.update({
    where: { id: examId },
    data: data,
    select: {
      id: true,
      title: true,
      description: true,
      startAt: true,
      endAt: true,
      durationMins: true,
      timingMode: true,
      sectionLockPolicy: true,
      status: true,
    },
  });
};

export const deleteExamAndChildren = (examId: string) => {
  return prisma.$transaction(async (tx) => {
    // Get all response IDs for this exam's attempts
    const responses = await tx.response.findMany({
      where: { attempt: { examId: examId } },
      select: { id: true },
    });
    const responseIds = responses.map((r) => r.id);

    // 1. Delete all grading jobs (which reference responses)
    if (responseIds.length > 0) {
      await tx.gradingJob.deleteMany({
        where: { responseId: { in: responseIds } },
      });
    }

    // 2. Delete all response artifacts (which reference responses)
    if (responseIds.length > 0) {
      await tx.responseArtifact.deleteMany({
        where: { responseId: { in: responseIds } },
      });
    }

    // 3. Delete all evaluations (which are linked to responses)
    if (responseIds.length > 0) {
      await tx.evaluation.deleteMany({
        where: { responseId: { in: responseIds } },
      });
    }

    // 4. Delete all responses (which are linked to attempts)
    await tx.response.deleteMany({
      where: { attempt: { examId: examId } },
    });

    // 5. Delete all attempt sections
    await tx.attemptSection.deleteMany({
      where: { attempt: { examId: examId } },
    });

    // 6. Delete all attempts for this exam
    await tx.attempt.deleteMany({
      where: { examId: examId },
    });

    // 7. Delete links from sections to questions
    await tx.sectionQuestion.deleteMany({
      where: { section: { examId: examId } },
    });

    // 8. Delete all questions for this exam
    await tx.question.deleteMany({
      where: { examId: examId },
    });

    // 9. Delete all sections for this exam
    await tx.examSection.deleteMany({
      where: { examId: examId },
    });

    // 10. Delete all assignments for this exam
    await tx.examAssignment.deleteMany({
      where: { examId: examId },
    });

    // 11. Finally, delete the exam itself
    const deletedExam = await tx.exam.delete({
      where: { id: examId },
    });

    return deletedExam;
  });
};