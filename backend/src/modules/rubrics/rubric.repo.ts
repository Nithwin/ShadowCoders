import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';

/**
 * Creates a new rubric record in the database.
 */
export const createRubric = (data: Prisma.RubricCreateInput) => {
  return prisma.rubric.create({
    data,
    select: {
      id: true,
      name: true,
      criteria: true,
      createdAt: true,
    },
  });
};