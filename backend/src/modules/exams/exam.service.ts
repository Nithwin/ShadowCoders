import z from "zod";
import { createExamSchema } from "./exam.zod";
import * as examRepo from "./exam.repo";

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
