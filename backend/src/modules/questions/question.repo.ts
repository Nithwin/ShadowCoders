import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";


export const createManyQuestions = (examId:string, questionsData: Prisma.QuestionCreateManyInput[]) => {

    return prisma.question.createMany({
        data: questionsData.map(q => (
            {...q,
                examId: examId,
            }
        ))
    })
}