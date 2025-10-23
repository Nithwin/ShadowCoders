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