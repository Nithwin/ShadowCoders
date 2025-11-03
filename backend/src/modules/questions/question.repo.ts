import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";


export const createManyQuestions = (examId:string, questionsData: Prisma.QuestionCreateManyInput[]) => {

    return prisma.question.createMany({
        data: questionsData.map(q => (
            {...q,
                examId: examId,
            }
        ))
    })
}

export const getQuestionById = (questionId: string) => {
  return prisma.question.findUnique({
    where: { id: questionId },
    select: {
      id: true,
      examId: true,
      type: true,
      prompt: true,
      points: true,
      // Include all fields a student might need
      options: true,
      starterCode: true,
      languageHints: true,
      wordLimit: true,
      mediaAssetId: true,
      passageAssetId: true,
      maxDurationSec: true,
      clozeTemplate: true,
      
      // Explicitly select fields needed for scrubbing
      testcases: true, 
      // We do NOT select correctOptionIds or blanks, 
      // as the service layer will handle scrubbing.
      // Or, we can select them and trust the service layer to remove them.
      // Let's select them for now.
      correctOptionIds: true,
      blanks: true
    },
  });
};

export const updateQuestion = (
  questionId: string,
  data: Prisma.QuestionUpdateInput
) => {
  return prisma.question.update({
    where: { id: questionId },
    data: data,
  });
};

export const deleteQuestion = (questionId: string) => {
  // We'll perform checks in the service. If we get here,
  // we first delete related links in the pivot table,
  // then delete the question itself.
  return prisma.$transaction(async (tx) => {
    // 1. Delete links from sections
    await tx.sectionQuestion.deleteMany({
      where: { questionId: questionId },
    });
    
    // Note: We'll check for Responses in the service.
    // Deleting a question with responses will fail.

    // 2. Delete the question
    return tx.question.delete({
      where: { id: questionId },
    });
  });
};