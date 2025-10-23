import z from "zod";
import {
  createExamSchema,
  assignExamSchema,
  listExamsSchema,
} from "./exam.zod";
import * as examRepo from "./exam.repo";
import { ExamStatus, Prisma } from "@prisma/client";

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
    data:exams,
    meta: {
        page,
        pageSize,
        totalCount,
        totalPages,
    }
  }
};
