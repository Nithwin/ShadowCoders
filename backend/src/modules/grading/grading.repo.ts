import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';

/**
 * Creates a new grading job in the database.
 */
export const createGradingJob = (data: Prisma.GradingJobCreateInput) => {
  return prisma.gradingJob.create({
    data,
    select: {
      id: true,
      status: true,
    },
  });
};

/**
 * Updates a grading job with the result from the code judge.
 */
export const updateGradingJob = (
  jobId: string,
  status: string,
  result: Prisma.JsonValue // <-- This allows null
) => {
  return prisma.gradingJob.update({
    where: { id: jobId },
    data: {
      status: status,
      // FIX: Check for null and convert to Prisma.JsonNull
      result: result === null ? Prisma.JsonNull : result, 
    },
    select: {
      id: true,
      status: true,
      result: true,
    },
  });
};