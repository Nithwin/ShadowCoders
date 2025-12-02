import { z } from 'zod';
import { createRubricSchema, updateRubricSchema, listRubricsSchema } from './rubric.zod';
import * as rubricRepo from './rubric.repo';
import { Prisma } from '@prisma/client';

// Infer the TypeScript type from the Zod schema's body
type CreateRubricInput = z.infer<typeof createRubricSchema>['body'];
type UpdateRubricInput = z.infer<typeof updateRubricSchema>['body'];
type ListRubricsQuery = z.infer<typeof listRubricsSchema>['query'];

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

export const listRubrics = async (query: ListRubricsQuery) => {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 10;
  const { q } = query;

  const { rubrics, totalCount } = await rubricRepo.listRubrics({
    page,
    pageSize,
    ...(q && { searchQuery: q }),
  });

  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    data: rubrics,
    meta: {
      page,
      pageSize,
      totalCount,
      totalPages,
    },
  };
};

export const getRubricById = async (id: string) => {
  const rubric = await rubricRepo.getRubricById(id);
  if (!rubric) {
    throw { status: 404, message: 'Rubric not found' };
  }
  return rubric;
};

export const updateRubric = async (id: string, input: UpdateRubricInput) => {
  // Check if rubric exists
  const existing = await rubricRepo.getRubricById(id);
  if (!existing) {
    throw { status: 404, message: 'Rubric not found' };
  }

  // Prepare update data
  const dataToUpdate: Prisma.RubricUpdateInput = {};
  
  if (input.name !== undefined) {
    dataToUpdate.name = input.name;
  }
  
  if (input.criteria !== undefined) {
    dataToUpdate.criteria = input.criteria as unknown as Prisma.InputJsonValue;
  }

  const updatedRubric = await rubricRepo.updateRubric(id, dataToUpdate);
  return updatedRubric;
};

export const deleteRubric = async (id: string) => {
  // Check if rubric exists and is being used
  const rubric = await rubricRepo.getRubricById(id);
  if (!rubric) {
    throw { status: 404, message: 'Rubric not found' };
  }

  // Check if rubric is being used
  if (rubric._count.questions > 0 || rubric._count.evaluations > 0) {
    throw {
      status: 400,
      message: 'Cannot delete rubric that is being used by questions or evaluations',
    };
  }

  await rubricRepo.deleteRubric(id);
  return { message: 'Rubric deleted successfully' };
};