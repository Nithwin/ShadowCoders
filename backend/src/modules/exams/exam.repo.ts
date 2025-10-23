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
  });

  const totalCount = await prisma.exam.count({
    where: whereClause,
  });

  return {
    exams,
    totalCount,
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
  const whereClause: Prisma.ExamWhereInput = {
    // Must be published
    status: ExamStatus.PUBLISHED,
    // Filter by time window based on the 'filter' parameter
    ...(filter === "UPCOMING" && { startAt: { gt: now } }), // Start date is in the future
    ...(filter === "LIVE" && { startAt: { lte: now }, endAt: { gt: now } }), // Live now
    ...(filter === "COMPLETED" && { endAt: { lte: now } }), // End date is in the past
    // Filter by search query (title/description)
    ...(searchQuery && {
      OR: [
        { title: { contains: searchQuery, mode: "insensitive" } },
        { description: { contains: searchQuery, mode: "insensitive" } },
      ],
    }),
    // CRITICAL: Filter by assignment
    assignments: {
      some: {
        OR: [
          // Condition 1: Assigned via cohort match (only if student has cohort info)
          ...(student.year && student.department && student.section
            ? [
                {
                  cohortYear: student.year,
                  cohortDepartment: student.department,
                  cohortSection: student.section,
                },
              ]
            : []),
          // Condition 2: Assigned directly via student ID
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

  // Fetch the exams for the current page
  const exams = await prisma.exam.findMany({
    where: whereClause,
    skip: skip,
    take: pageSize,
    orderBy: {
      startAt: filter === "COMPLETED" ? "desc" : "asc", // Show completed newest first, others oldest first
    },
    // Select only needed fields (optional, but good practice)
    select: {
      id: true,
      title: true,
      description: true,
      startAt: true,
      endAt: true,
      durationMins: true,
      status: true,
      // Add any other fields the student needs to see in the list
    },
  });

  // Fetch the total count matching the filters
  const totalCount = await prisma.exam.count({
    where: whereClause,
  });

  return { exams, totalCount };
};