import { z } from 'zod';
import { createSectionSchema } from './section.zod';
import * as sectionRepo from './section.repo';
// We need to import the exam repo to check if the exam exists
import * as examRepo from '../exams/exam.repo'; 
import { Prisma } from '@prisma/client';

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