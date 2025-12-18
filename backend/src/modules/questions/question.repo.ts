/**
 * Lists all questions for a specific exam.
 * Returns all fields needed for editing, including testcases, options, etc.
 */
export const listQuestionsForExam = (examId: string) => {
  return prisma.question.findMany({
    where: { examId: examId },
    orderBy: { order: 'asc' },
    select: {
      id: true,
      order: true,
      type: true,
      prompt: true,
      points: true,
      options: true,
      correctOptionIds: true,
      testcases: true,
      starterCode: true,
      wordLimit: true,
      config: true,
    },
  });
};
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";


export const createManyQuestions = async (examId: string, questionsData: Prisma.QuestionCreateManyInput[]) => {
  return prisma.$transaction(
    questionsData.map((q) =>
      prisma.question.create({
        data: {
          ...q,
          examId: examId,
        },
      })
    )
  );
};

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
      mediaAsset: {
        select: {
          id: true,
          url: true,
          kind: true,
        },
      },
      passageAssetId: true,
      maxDurationSec: true,
      clozeTemplate: true,
      config: true,
      
      // Explicitly select fields needed for scrubbing
      testcases: true, 
      // We do NOT select correctOptionIds or blanks, 
      // as the service layer will handle scrubbing.
      // Or, we can select them and trust the service layer to remove them.
      // Let's select them for now.
      correctOptionIds: true,
      blanks: true,
      reports: { // Include reports to check status
          select: { id: true, status: true }
      } 
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
    select: {
      id: true,
      type: true,
      prompt: true,
      points: true,
      options: true,
      correctOptionIds: true,
      testcases: true,
      starterCode: true,
      wordLimit: true,
      order: true,
    },
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