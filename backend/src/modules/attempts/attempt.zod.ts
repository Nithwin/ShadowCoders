import z from "zod";


const answerPayloadSchema = z.record(z.string(), z.any()).nullable();

export const submitAnswerSchema = z.object({
    body: z.object({
        questionId: z.string().cuid({message: 'Invalid question ID format'}),
        answer: answerPayloadSchema,
    })
})
