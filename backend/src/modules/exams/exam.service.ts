import { z } from 'zod';
import {
  createExamSchema,
  assignExamSchema,
  listExamsSchema,
  studentListExamsSchema,
} from "./exam.zod";
import * as examRepo from "./exam.repo";
import { ExamStatus, Prisma, User } from "@prisma/client";
import * as userRepo from '../auth/auth.repo'; 

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
  // Ensure defaults are applied
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 10;
  const { status, q } = query;
  
  const { exams, totalCount } = await examRepo.listExams({
    ...(status && { status: status as ExamStatus }),
    ...(q && { searchQuery: q }),
    page,
    pageSize,
  });

  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    data: exams,
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