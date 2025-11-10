import { z } from 'zod';
import {
  createExamSchema,
  assignExamSchema,
  listExamsSchema,
  studentListExamsSchema,
  updateExamSchema,
} from "./exam.zod";
import * as examRepo from "./exam.repo";
import { ExamStatus, Prisma, User } from "@prisma/client";
import * as userRepo from '../auth/auth.repo'; 
import { prisma } from '../../lib/prisma';

type CreateExamInput = z.infer<typeof createExamSchema>["body"];

export const createExam = async (input: CreateExamInput) => {
  if (new Date(input.startAt) >= new Date(input.endAt)) {
    throw {
      status: 400,
      message: "Exam start date must be before the end date",
    };
  }
  const dataToSave = {
    ...input,
    description: input.description ?? null,
    negativeMarkPerWrong: input.negativeMarkPerWrong ?? null,
    startAt: new Date(input.startAt),
    endAt: new Date(input.endAt),
    timingMode: input.timingMode,
    sectionLockPolicy: input.sectionLockPolicy,
    randomizeQuestions: input.randomizeQuestions ?? false,
  };

  const newExam = await examRepo.createExam(dataToSave);
  return newExam;
};

type AssignExamInput = z.infer<typeof assignExamSchema>["body"];

export const assignExam = async (examId: string, input: AssignExamInput) => {
  const dataToSave = {
    assignToAll: input.assignToAll ?? false,
    cohortYear: input.cohortYear ?? null,
    cohortDepartment: input.cohortDepartment ?? null,
    cohortSection: input.cohortSection ?? null,
    studentIds: input.studentIds
      ? (input.studentIds as unknown as Prisma.InputJsonValue)
      : Prisma.JsonNull,
  };
  const assignment = await examRepo.createExamAssignment(examId, dataToSave);
  return assignment;
};

export const pubishExam = async (examId: string) => {
  const exam = await examRepo.findExamById(examId);

  if (!exam) {
    throw {
      status: 404,
      message: "Exam not found",
    };
  }

  if (exam.status !== ExamStatus.DRAFT) {
    throw {
      status: 400,
      message: `Exam cannot be published. Current status: ${exam.status}`,
    };
  }

  const updatedExam = await examRepo.updateExamStatus(
    examId,
    ExamStatus.PUBLISHED
  );
  return updatedExam;
};

type ListExamQuery = z.infer<typeof listExamsSchema>["query"];

export const listExams = async (query: ListExamQuery) => {
  const { page, pageSize, status, q } = query;

  const repoParams: {
    page: number;
    pageSize: number;
    status?: ExamStatus;
    searchQuery?: string;
  } = {
    page,
    pageSize,
  };

  if (status && status !== 'ALL') {
    repoParams.status = status;
  }

  if (q) {
    repoParams.searchQuery = q;
  }

  const { exams, totalCount } = await examRepo.listExams(repoParams);

  const processedExams = exams.map(exam => ({
    ...exam,
    negativeMarkPerWrong: exam.negativeMarkPerWrong?.toString() ?? null,
  }));

  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    data: processedExams,
    meta: {
        page,
        pageSize,
        totalCount,
        totalPages,
    }
  };
};

type StudentListExamsQuery = z.infer<typeof studentListExamsSchema>['query'];

export const listExamsForStudent = async (studentId: string, query: StudentListExamsQuery) => {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 10;
  const { filter, q } = query;

  // 1. Fetch the student's details (needed for cohort matching)
  const student = await userRepo.findStudentWithCohortInfo(studentId);
  
  if (!student) {
    throw { status: 404, message: 'Student not found' };
  }

  // 2. Call the repository to get exams and the total count
  const { exams, totalCount } = await examRepo.listExamsForStudent({
    student: {
      id: student.id,
      year: student.year, 
      department: student.department,
      section: student.section,
    },
    ...(filter && { filter }),
    ...(q && { searchQuery: q }),
    page,
    pageSize,
  });

  // 3. Calculate pagination metadata
  const totalPages = Math.ceil(totalCount / pageSize);

  // 4. Return the data and metadata
  return {
    data: exams,
    meta: {
      page,
      pageSize,
      totalCount,
      totalPages,
    },
  };
};



type UpdateExamInput = z.infer<typeof updateExamSchema>['body'];

export const updateExam = async (examId: string, input: UpdateExamInput) => {
  // 1. --- Validation ---
  const existingExam = await examRepo.findExamById(examId);
  if (!existingExam) {
    throw { status: 404, message: 'Exam not found' };
  }

  // 2. --- Prepare Data for Repository ---
  // Manually build the update object to satisfy exactOptionalPropertyTypes
  const dataToUpdate: Prisma.ExamUpdateInput = {};

  if (input.title !== undefined) {
    dataToUpdate.title = input.title;
  }
  if (input.description !== undefined) {
    dataToUpdate.description = input.description ?? null;
  }
  if (input.startAt !== undefined) {
    dataToUpdate.startAt = new Date(input.startAt);
  }
  if (input.endAt !== undefined) {
    dataToUpdate.endAt = new Date(input.endAt);
  }
  if (input.durationMins !== undefined) {
    dataToUpdate.durationMins = input.durationMins;
  }
  if (input.timingMode !== undefined) {
    dataToUpdate.timingMode = input.timingMode;
  }
  if (input.sectionLockPolicy !== undefined) {
    dataToUpdate.sectionLockPolicy = input.sectionLockPolicy;
  }
  if (input.randomizeQuestions !== undefined) {
    dataToUpdate.randomizeQuestions = input.randomizeQuestions;
  }
  if (input.negativeMarkPerWrong !== undefined) {
    dataToUpdate.negativeMarkPerWrong = input.negativeMarkPerWrong ?? null;
  }

  // 3. --- Call Repository ---
  const updatedExam = await examRepo.updateExam(examId, dataToUpdate);

  return updatedExam;
};

export const deleteExam = async (examId: string) => {
  // 1. --- Validation: Check if the exam exists AND has attempts ---
  const existingExam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      _count: {
        select: { attempts: true }, // Count how many attempts it has
      },
    },
  });

  if (!existingExam) {
    throw { status: 404, message: 'Exam not found' };
  }

  // 2. --- Business Logic: PREVENT DELETING EXAM WITH SUBMISSIONS ---
  if (existingExam._count.attempts > 0) {
    throw {
      status: 400,
      message: 'Cannot delete an exam that has student attempts. Please archive it instead.',
    };
  }

  // 3. --- Call Repository (if safe) ---
  // If there are no attempts, it's safe to delete the exam and its children.
  await examRepo.deleteExamAndChildren(examId);

  return { message: 'Exam and all related questions/sections deleted successfully' };
};

/**
 * Fetches a single exam's details for editing.
 */
export const getExamById = async (examId: string) => {
  const exam = await examRepo.findExamById(examId);
  if (!exam) {
    throw { status: 404, message: 'Exam not found' };
  }
  return exam;
};