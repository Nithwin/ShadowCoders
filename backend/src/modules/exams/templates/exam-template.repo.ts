import { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma";

export const createTemplate = (data: Prisma.ExamTemplateCreateInput) => {
  return prisma.examTemplate.create({
    data,
  });
};

export const findTemplateById = (id: string) => {
  return prisma.examTemplate.findUnique({
    where: { id },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
};

export const listTemplates = async (params: {
  userId: string;
  isPublic?: boolean;
  searchQuery?: string;
  page: number;
  pageSize: number;
}) => {
  const { userId, isPublic, searchQuery, page, pageSize } = params;
  const skip = (page - 1) * pageSize;

  const whereClause: Prisma.ExamTemplateWhereInput = {
    OR: [
      { createdBy: userId }, // My templates
      ...(isPublic ? [{ isPublic: true }] : []), // Public templates (if requested)
    ],
  };

  if (searchQuery) {
    whereClause.AND = {
      OR: [
        { title: { contains: searchQuery, mode: "insensitive" } },
        { description: { contains: searchQuery, mode: "insensitive" } },
      ],
    };
  }

  const templates = await prisma.examTemplate.findMany({
    where: whereClause,
    skip,
    take: pageSize,
    orderBy: { createdAt: "desc" },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  const totalCount = await prisma.examTemplate.count({
    where: whereClause,
  });

  return { templates, totalCount };
};

export const deleteTemplate = (id: string) => {
  return prisma.examTemplate.delete({
    where: { id },
  });
};
