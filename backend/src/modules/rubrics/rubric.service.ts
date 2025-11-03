import { z } from 'zod';
import { createRubricSchema } from './rubric.zod';
import * as rubricRepo from './rubric.repo';
import { Prisma } from '@prisma/client';

// Infer the TypeScript type from the Zod schema's body
type CreateRubricInput = z.infer<typeof createRubricSchema>['body'];

export const createRubric = async (
  creatorId: string, // The ID of the STAFF user
  input: CreateRubricInput
) => {
  // 1. Prepare the data for the repository
  const dataToSave: Prisma.RubricCreateInput = {
    name: input.name,
    criteria: input.criteria as unknown as Prisma.InputJsonValue, // Cast criteria to Prisma's JSON type
    createdBy: creatorId, // Store who created the rubric
  };

  // 2. Call the repository to save the data
  const newRubric = await rubricRepo.createRubric(dataToSave);

  return newRubric;
};