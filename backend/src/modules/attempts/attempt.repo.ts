import { Prisma, QType } from "@prisma/client";
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
        }
    })
}

export const upsertResponse = async (data: {
  attemptId: string;
  questionId: string;
  type: QType;
  answer: Prisma.InputJsonValue | Prisma.NullTypes.JsonNull;
}) => {
  const { attemptId, questionId, type, answer, ...otherData } = data;

  // Check if response already exists
  const existing = await prisma.response.findFirst({
    where: {
      attemptId: attemptId,
      questionId: questionId,
    },
  });

  if (existing) {
    // Update existing response
    return prisma.response.update({
      where: { id: existing.id },
      data: {
        answer: answer,
        ...otherData,
      },
    });
  } else {
    // Create new response
    return prisma.response.create({
      data: {
        attemptId: attemptId,
        questionId: questionId,
        type: type,
        answer: answer,
        ...otherData,
      },
    });
  }
};