/**
 * Fetches all questions for a specific exam.
 */
export const listQuestionsForExam = async (examId: string) => {
  // We can add validation here later, but for now, just call the repo
  const questions = await questionRepo.listQuestionsForExam(examId);
  return questions;
};
import { z } from 'zod';
import { addQuestionsSchema, updateQuestionSchema } from './question.zod';
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

type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>['body'];

export const updateQuestion = async (
  questionId: string,
  input: UpdateQuestionInput
) => {
  // 1. --- Validation: Check if the question exists ---
  const existingQuestion = await prisma.question.findUnique({
    where: { id: questionId },
    select: { type: true }, // We need its type
  });

  if (!existingQuestion) {
    throw { status: 404, message: 'Question not found' };
  }

  // 2. --- Prepare Data (Type-Safe Update) ---
  // Manually build the update object to ensure we only update
  // fields relevant to this question's type.
  const dataToUpdate: Prisma.QuestionUpdateInput = {};

  // Add common fields if they are provided
  if (input.order !== undefined) dataToUpdate.order = input.order;
  if (input.points !== undefined) dataToUpdate.points = input.points;
  if (input.prompt !== undefined) dataToUpdate.prompt = input.prompt;

  // Add type-specific fields
  switch (existingQuestion.type) {
    case QType.MCQ:
      if (input.options !== undefined)
        dataToUpdate.options = input.options as Prisma.JsonArray;
      if (input.correctOptionIds !== undefined)
        dataToUpdate.correctOptionIds = input.correctOptionIds as Prisma.JsonArray;
      break;
    case QType.CODING:
      if (input.starterCode !== undefined)
        dataToUpdate.starterCode = input.starterCode ?? null;
      if (input.testcases !== undefined)
        dataToUpdate.testcases = input.testcases as Prisma.JsonArray;
      break;
    case QType.ESSAY:
      if (input.wordLimit !== undefined)
        dataToUpdate.wordLimit = input.wordLimit ?? null;
      break;
    // Add cases for SPEAKING, LISTENING, FILL, READING here...
  }
  
  // Add other optional fields
  if (input.mediaAssetId !== undefined) dataToUpdate.mediaAsset = { connect: { id: input.mediaAssetId } };
  if (input.passageAssetId !== undefined) dataToUpdate.passageAsset = { connect: { id: input.passageAssetId } };


  // 3. --- Call Repository ---
  const updatedQuestion = await questionRepo.updateQuestion(
    questionId,
    dataToUpdate
  );

  return updatedQuestion;
};

export const deleteQuestion = async (questionId: string) => {
  // 1. --- Validation: Check if the question exists AND has responses ---
  const existingQuestion = await prisma.question.findUnique({
    where: { id: questionId },
    include: {
      _count: {
        select: { responses: true }, // Count how many responses it has
      },
    },
  });

  if (!existingQuestion) {
    throw { status: 404, message: 'Question not found' };
  }

  // 2. --- Business Logic: PREVENT DELETING A QUESTION WITH SUBMISSIONS ---
  if (existingQuestion._count.responses > 0) {
    throw {
      status: 400,
      message: 'Cannot delete a question that has already been answered by students.',
    };
  }

  // 3. --- Call Repository (if safe) ---
  // If there are no responses, it's safe to delete the question and its links
  await questionRepo.deleteQuestion(questionId);

  return { message: 'Question deleted successfully' };
};