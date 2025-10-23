import { z } from 'zod';
import { addQuestionsSchema } from './question.zod';
import * as questionRepo from './question.repo';
import { Prisma, QType } from '@prisma/client';

type AddQuestionsInput = z.infer<typeof addQuestionsSchema>['body']['questions'];

export const addQuestionsToExam = async (examId: string, questions: AddQuestionsInput) => {
  const questionsData = questions.map((q) => {
    const baseData: Prisma.QuestionCreateManyInput = {
      examId,
      order: q.order,
      points: q.points,
      type: q.type,
      prompt: q.prompt ?? null,
    };

    switch (q.type) {
      case QType.MCQ:
        baseData.options = q.options ? (q.options as Prisma.JsonArray) : Prisma.JsonNull;
        baseData.correctOptionIds = q.correctOptionIds ? (q.correctOptionIds as Prisma.JsonArray) : Prisma.JsonNull;
        break;
      case QType.CODING:
        baseData.starterCode = q.starterCode ?? null;
        baseData.testcases = q.testcases ? (q.testcases as Prisma.JsonArray) : Prisma.JsonNull;
        break;
      case QType.ESSAY:
        baseData.wordLimit = q.wordLimit ?? null;
        break;
      default:
        const exhaustiveCheck: never = q; 
        throw new Error(`Unsupported question type encountered: ${JSON.stringify(exhaustiveCheck)}`);
    }
    return baseData;
  });

  return questionRepo.createManyQuestions(examId, questionsData);
};