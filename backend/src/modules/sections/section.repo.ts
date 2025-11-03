import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';

/**
 * Creates a new exam section linked to a specific exam.
 */
export const createSection = (
  examId: string,
  data: Omit<Prisma.ExamSectionCreateInput, 'exam'> // We omit 'exam' because we connect it manually
) => {
  return prisma.examSection.create({
    data: {
      ...data,
      exam: {
        connect: { id: examId }, // Link this section to the parent exam
      },
    },
    select: {
      id: true,
      title: true,
      order: true,
      description: true,
      durationMins: true,
    },
  });
};

export const addQuestionsToSection = (
  sectionId: string,
  questionsData: Prisma.SectionQuestionCreateManyInput[]
) => {
  // Use createMany for efficient bulk insertion
  return prisma.sectionQuestion.createMany({
    data: questionsData.map((q) => ({
      ...q,
      sectionId: sectionId, // Ensure the sectionId is correctly set
    })),
    skipDuplicates: true, // In case a link already exists
  });
};

export const updateSection = (
  sectionId: string,
  data: Prisma.ExamSectionUpdateInput
) => {
  return prisma.examSection.update({
    where: { id: sectionId },
    data: data,
    select: {
      id: true,
      title: true,
      order: true,
      description: true,
      durationMins: true,
    },
  });
};