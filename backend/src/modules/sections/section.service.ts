import { z } from 'zod';
import { addQuestionsToSectionSchema, createSectionSchema } from './section.zod';
import * as sectionRepo from './section.repo';
// We need to import the exam repo to check if the exam exists
import * as examRepo from '../exams/exam.repo'; 
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';

// Infer the TypeScript type from the Zod schema's body
type CreateSectionInput = z.infer<typeof createSectionSchema>['body'];

export const createSection = async (
  examId: string,
  input: CreateSectionInput
) => {
  // 1. --- Validation ---
  // Check if the parent exam exists first
  const exam = await examRepo.findExamById(examId);
  if (!exam) {
    throw { status: 404, message: 'Exam not found' };
  }

  // 2. --- Prepare Data ---
  // Convert optional undefined fields to null for Prisma
  const dataToSave = {
    ...input,
    description: input.description ?? null,
    durationMins: input.durationMins ?? null,
  };

  // 3. --- Call Repository ---
  const newSection = await sectionRepo.createSection(examId, dataToSave);
  return newSection;
};

type AddQuestionsInput = z.infer<
  typeof addQuestionsToSectionSchema
>['body']['questions'];

export const addQuestionsToSection = async (
  sectionId: string,
  questions: AddQuestionsInput
) => {
  // 1. --- Validation: Check if the section exists ---
  const section = await prisma.examSection.findUnique({
    where: { id: sectionId },
    select: { examId: true }, // Get the parent examId
  });
  if (!section) {
    throw { status: 404, message: 'Section not found' };
  }

  // 2. --- Validation: Check if all questions exist and belong to the same exam ---
  const questionIds = questions.map((q) => q.questionId);
  const questionsFromDb = await prisma.question.findMany({
    where: {
      id: { in: questionIds },
      examId: section.examId, // CRITICAL: Ensure all questions are from the same exam
    },
    select: { id: true },
  });

  if (questionsFromDb.length !== questionIds.length) {
    throw {
      status: 400,
      message: 'One or more questions do not exist or do not belong to this exam',
    };
  }

  // 3. --- Prepare Data for Repository ---
  const dataToSave: Prisma.SectionQuestionCreateManyInput[] = questions.map(
    (q) => ({
      questionId: q.questionId,
      order: q.order,
      sectionId: sectionId, // This will be set by the repo, but good practice
    })
  );

  // 4. --- Call Repository ---
  await sectionRepo.addQuestionsToSection(sectionId, dataToSave);

  return { message: 'Questions added to section successfully' };
};