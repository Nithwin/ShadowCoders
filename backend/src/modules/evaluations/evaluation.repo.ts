import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';

/**
 * Creates a new evaluation record for a specific response.
 */
export const createEvaluation = (
  responseId: string,
  assessorId: string, // The ID of the STAFF user doing the grading
  data: Prisma.EvaluationCreateWithoutResponseInput
) => {
  return prisma.evaluation.create({
    data: {
      ...data,
      // Connect this evaluation to the response and the assessor (grader)
      response: {
        connect: { id: responseId },
      },
      assessor: {
        connect: { id: assessorId },
      },
      // Note: Connecting a rubric would follow the same pattern if rubricId is provided in 'data'
    },
    select: {
      id: true,
      kind: true,
      score: true,
      comments: true,
      isFinal: true,
    },
  });
};