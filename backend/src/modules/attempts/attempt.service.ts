import * as attemptRepo from "./attempt.repo";
import { Prisma, ExamStatus, AttemptStatus } from "@prisma/client";
import { shuffleArray } from "../../lib/utils";
import { prisma } from "../../lib/prisma";
import z from "zod";
import { submitAnswerSchema } from "./attempt.zod";
import * as userRepo from "../auth/auth.repo";

export const startAttempt = async (studentId: string, examId: string) => {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      assignments: true,
      questions: { select: { id: true } },
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

  let orderMap: Prisma.InputJsonValue | null = null;
  if (exam.randomizeQuestions && exam.questions.length > 0) {
    const questionIds = exam.questions.map((q) => q.id);
    orderMap = shuffleArray(questionIds) as Prisma.InputJsonValue;
  }

  const attemptData: Prisma.AttemptCreateInput = {
    status: AttemptStatus.IN_PROGRESS,
    orderMap: orderMap ?? Prisma.JsonNull,
    student: { connect: { id: studentId } },
    exam: { connect: { id: examId } },
  };

  try {
    const newAttempt = await attemptRepo.createAttempt(attemptData);
    return newAttempt;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw { status: 409, message: "Attempt already exists or was submitted" };
    }
    throw error;
  }
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
  const responseData = {
    attemptId: attemptId,
    questionId: questionId,
    answer: answer ? (answer as Prisma.InputJsonValue) : Prisma.JsonNull,
    type: question.type,
  };
  const savedResponse = await attemptRepo.upsertResponse(responseData);

  return savedResponse;
};
