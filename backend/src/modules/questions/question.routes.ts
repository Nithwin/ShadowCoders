import { requireRole, verifyAccess } from "../../middleware/auth"
import { validate } from "../../middleware/validate"
import { addQuestionsSchema, updateQuestionSchema } from "./question.zod"
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

    app.get(
    '/api/student/attempts/:attemptId/question/:questionId',
    verifyAccess, // 1. Ensures user is logged in (provides studentId)
    // No validation needed for params, handled in controller/service
    questionController.getQuestionHandler // 2. Run the controller
  );

  app.put(
    '/api/admin/questions/:questionId',
    verifyAccess,
    requireRole('STAFF'),
    validate(updateQuestionSchema),
    questionController.updateQuestionHandler
  );

  app.delete(
    '/api/admin/questions/:questionId',
    verifyAccess,
    requireRole('STAFF'),
    // No Zod validation needed for a simple delete
    questionController.deleteQuestionHandler
  );
}