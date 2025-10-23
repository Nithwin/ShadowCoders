import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";

export const createExam = (data: Prisma.ExamCreateInput) => {
    return prisma.exam.create({
        data:data,
    })
};