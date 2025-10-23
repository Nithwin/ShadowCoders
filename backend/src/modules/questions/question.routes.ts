import { requireRole, verifyAccess } from "../../middleware/auth"
import { validate } from "../../middleware/validate"
import { addQuestionsSchema } from "./question.zod"
import * as questionController from './question.controller';
import { Express } from "express";

export const registerQuestionRoutes = (app: Express) => {
    app.post(
        '/api/admin/exams/:examId/questions',
        verifyAccess,
        requireRole('STAFF'),
        validate(addQuestionsSchema),
        questionController.addQuestionsHandler
    )
}