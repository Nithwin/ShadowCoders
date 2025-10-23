import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";


export const createAttempt = (data: Prisma.AttemptCreateInput) => {
    return prisma.attempt.create({
        data,
        select:{
            id:true,
            examId:true,
            studentId:true,
            startedAt:true,
            status:true,
            orderMap:true,
        }
    })
}