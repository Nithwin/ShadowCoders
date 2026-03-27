import { z } from 'zod';
import { addQuestionsToSectionSchema, createSectionSchema, updateSectionSchema } from './section.zod';
import * as sectionRepo from './section.repo';
// We need to import the exam repo to check if the exam exists
import * as examRepo from '../exams/exam.repo'; 
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';

// Infer the TypeScript type from the Zod schema's body
type CreateSectionInput = z.infer<typeof createSectionSchema>['body'];

const syncExamDurationForBothMode = async (examId: string) => {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: {
      timingMode: true,
      durationMins: true,
      sections: {
        select: {
          durationMins: true,
        },
      },
    },
  });

  if (!exam || exam.timingMode !== 'BOTH') {
    return;
  }

  const configuredDurations = exam.sections
    .map((section) => section.durationMins)
    .filter((duration): duration is number => typeof duration === 'number' && duration > 0);

  if (configuredDurations.length === 0) {
    return;
  }

  const totalDuration = configuredDurations.reduce((sum, mins) => sum + mins, 0);

  if (totalDuration !== exam.durationMins) {
    await examRepo.updateExam(examId, { durationMins: totalDuration });
  }
};

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
  await syncExamDurationForBothMode(examId);
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

type UpdateSectionInput = z.infer<typeof updateSectionSchema>['body'];

export const updateSection = async (
  sectionId: string,
  input: UpdateSectionInput
) => {
  // 1. --- Validation: Check if the section exists ---
  // We can use prisma directly for this simple check
  const existingSection = await prisma.examSection.findUnique({
    where: { id: sectionId },
    select: { id: true, examId: true },
  });

  if (!existingSection) {
    throw { status: 404, message: 'Section not found' };
  }

  // 2. --- Prepare Data for Repository ---
  // Manually build the update object to satisfy exactOptionalPropertyTypes
  // and handle converting undefined to null for optional fields.
  const dataToUpdate: Prisma.ExamSectionUpdateInput = {};
  
  if (input.title !== undefined) {
    dataToUpdate.title = input.title;
  }
  if (input.order !== undefined) {
    dataToUpdate.order = input.order;
  }
  if (input.description !== undefined) {
    dataToUpdate.description = input.description ?? null;
  }
  if (input.durationMins !== undefined) {
    dataToUpdate.durationMins = input.durationMins ?? null;
  }

  // 3. --- Call Repository ---
  const updatedSection = await sectionRepo.updateSection(sectionId, dataToUpdate);
  await syncExamDurationForBothMode(existingSection.examId);

  return updatedSection;
};

export const deleteSection = async (sectionId: string) => {
  // 1. --- Validation: Check if the section exists ---
  const existingSection = await prisma.examSection.findUnique({
    where: { id: sectionId },
    select: {
      id: true,
      examId: true,
      _count: {
        select: { attempts: true },
      },
    },
  });

  if (!existingSection) {
    throw { status: 404, message: 'Section not found' };
  }

  // 2. --- Business Logic: Prevent deleting a section with student progress ---
  if (existingSection._count.attempts > 0) {
    throw {
      status: 400,
      message: 'Cannot delete a section that students have already started. Please delete the parent exam instead if no attempts exist.',
    };
  }

  // 3. --- Call Repository (if safe) ---
  await sectionRepo.deleteSection(sectionId);
  await syncExamDurationForBothMode(existingSection.examId);

  return { message: 'Section and all related question links deleted successfully' };
};
export const removeQuestionFromSection = async (
  sectionId: string,
  questionId: string
) => {
  try {
    // Call the repository to delete the link
    await sectionRepo.removeQuestionFromSection(sectionId, questionId);
    return { message: 'Question removed from section successfully' };
  } catch (error) {
    // Handle cases where the link doesn't exist (P2025: Record not found)
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw { status: 404, message: 'Link between section and question not found' };
    }
    // Re-throw other errors
    throw error;
  }
};

export const listSectionsForExam = async (examId: string) => {
  // Check if exam exists
  const exam = await examRepo.findExamById(examId);
  if (!exam) {
    throw { status: 404, message: 'Exam not found' };
  }

  // Fetch all sections for this exam with their questions
  const sections = await prisma.examSection.findMany({
    where: { examId },
    include: {
      sectionQuestions: {
        include: {
          question: {
            select: {
              id: true,
              type: true,
              prompt: true,
              points: true,
              order: true,
            },
          },
        },
        orderBy: {
          order: 'asc',
        },
      },
    },
    orderBy: {
      order: 'asc',
    },
  });

  return sections.map((section) => ({
    id: section.id,
    title: section.title,
    description: section.description,
    order: section.order,
    durationMins: section.durationMins,
    questions: section.sectionQuestions.map((sq) => ({
      questionId: sq.questionId,
      order: sq.order,
      question: sq.question,
    })),
  }));
};