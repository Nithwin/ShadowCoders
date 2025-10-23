import * as attemptRepo from './attempt.repo';
import { Prisma, ExamStatus, AttemptStatus } from '@prisma/client';
import { shuffleArray } from '../../lib/utils';
import { prisma } from "../../lib/prisma";

export const startAttempt = async (studentId: string, examId: string) => {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      assignments: true,
      questions: { select: { id: true } },
    },
  });

  if (!exam) {
    throw { status: 404, message: 'Exam not found' };
  }
  if (exam.status !== ExamStatus.PUBLISHED) {
    throw { status: 403, message: 'Exam is not published' };
  }
  const now = new Date();
  if (now < exam.startAt || now > exam.endAt) {
    throw { status: 403, message: 'Exam is not currently active' };
  }

  const isAssigned = exam.assignments.some(
    (a) => (a.studentIds as string[] | null)?.includes(studentId)
  );
  if (!isAssigned) {
    throw { status: 403, message: 'You are not assigned to this exam' };
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
      error.code === 'P2002'
    ) {
      throw { status: 409, message: 'Attempt already exists or was submitted' };
    }
    throw error;
  }
};
