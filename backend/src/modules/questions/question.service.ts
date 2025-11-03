import { z } from 'zod';
import { addQuestionsSchema } from './question.zod';
import * as questionRepo from './question.repo';
import { AttemptStatus, Prisma, QType } from '@prisma/client';
import { prisma } from '../../lib/prisma';

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

export const getQuestionForStudent = async (
  studentId: string,
  attemptId: string,
  questionId: string
) => {
  // 1. --- Validate Attempt ---
  // We must check the attempt first to get the examId
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    select: { studentId: true, status: true, examId: true },
  });

  if (!attempt) {
    throw { status: 404, message: 'Attempt not found' };
  }
  if (attempt.studentId !== studentId) {
    throw { status: 403, message: 'Forbidden: You do not have access to this attempt' };
  }
  if (attempt.status !== AttemptStatus.IN_PROGRESS) {
    throw { status: 403, message: `Cannot fetch question. Attempt status is ${attempt.status}` };
  }

  // 2. --- Fetch and Validate Question ---
  const question = await questionRepo.getQuestionById(questionId);

  if (!question) {
    throw { status: 404, message: 'Question not found' };
  }
  // Ensure the question belongs to the exam the student is attempting
  if (question.examId !== attempt.examId) {
    throw { status: 403, message: 'Forbidden: Question is not part of this exam' };
  }

  // 3. --- Scrub the Answer Data ---
  // Create a copy of the question and remove sensitive fields
  const scrubbedQuestion: any = { ...question };

  delete scrubbedQuestion.correctOptionIds;
  delete scrubbedQuestion.blanks;

  // For coding questions, only return non-hidden test cases
  if (question.type === QType.CODING && Array.isArray(question.testcases)) {
    scrubbedQuestion.testcases = question.testcases
      .filter((tc: any) => tc.isHidden === false)
      .map((tc: any) => ({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
      }));
  } else {
    // Ensure testcases are removed for non-coding questions
    delete scrubbedQuestion.testcases;
  }

  return scrubbedQuestion;
};