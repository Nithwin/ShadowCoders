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

/**
 * Lists all rubrics with pagination and search
 */
export const listRubrics = async (params: {
  page: number;
  pageSize: number;
  searchQuery?: string;
}) => {
  const { page, pageSize, searchQuery } = params;
  const skip = (page - 1) * pageSize;

  const where: Prisma.RubricWhereInput = searchQuery
    ? {
        name: {
          contains: searchQuery,
          mode: 'insensitive',
        },
      }
    : {};

  const [rubrics, totalCount] = await Promise.all([
    prisma.rubric.findMany({
      where,
      select: {
        id: true,
        name: true,
        criteria: true,
        createdAt: true,
        _count: {
          select: {
            questions: true,
            evaluations: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: pageSize,
    }),
    prisma.rubric.count({ where }),
  ]);

  return { rubrics, totalCount };
};

/**
 * Gets a single rubric by ID
 */
export const getRubricById = (id: string) => {
  return prisma.rubric.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      criteria: true,
      createdAt: true,
      _count: {
        select: {
          questions: true,
          evaluations: true,
        },
      },
    },
  });
};

/**
 * Updates a rubric
 */
export const updateRubric = (id: string, data: Prisma.RubricUpdateInput) => {
  return prisma.rubric.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      criteria: true,
      createdAt: true,
    },
  });
};

/**
 * Deletes a rubric
 */
export const deleteRubric = (id: string) => {
  return prisma.rubric.delete({
    where: { id },
  });
};