import { ExamStatus, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";

export const createExam = (data: Prisma.ExamCreateInput) => {
    return prisma.exam.create({
        data:data,
    })
};

export const createExamAssignment = (examId: string, assignmentData: Omit<Prisma.ExamAssignmentCreateManyInput, 'examId'>) => {
    return prisma.examAssignment.create({
        data: {
            ...assignmentData,
            exam: {
                connect: { id: examId },
            },
        },
    });
};

export const updateExamStatus = (examId: string, status: ExamStatus) => {
    return prisma.exam.update({
        where: { id: examId },
        data: { status },
    });
}

export const findExamById = (examId: string) => {
    return prisma.exam.findUnique({
        where: { id: examId },
    });
}

export const listExams = async (params: {
    status?: ExamStatus;
    searchQuery?: string;
    page: number;
    pageSize: number;
}) => {
    const { status, searchQuery, page, pageSize } = params;

    const skip = (page - 1) * pageSize;

    const whereClause: Prisma.ExamWhereInput = {};
    if (status) {
        whereClause.status = status;
    }
    if (searchQuery) {
        whereClause.OR = [
            { title: { contains: searchQuery, mode: 'insensitive' } },
            { description: { contains: searchQuery, mode: 'insensitive' } },
        ];
    }

    const exams = await prisma.exam.findMany({
        where: whereClause,
        skip: skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
    });

    const totalCount = await prisma.exam.count({
        where: whereClause,
    });

    return {
        exams,
        totalCount,
    };
};