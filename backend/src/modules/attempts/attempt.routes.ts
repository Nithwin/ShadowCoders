import { Express } from 'express';
import { verifyAccess } from '../../middleware/auth';
import * as attemptController from './attempt.controller';
import { validate } from '../../middleware/validate';
import { submitAnswerSchema } from './attempt.zod';

export const registerAttemptRoutes = (app: Express) => {
  app.post(
    '/api/student/exams/:examId/start',
    verifyAccess, 
    attemptController.startAttemptHandler // Call the controller
  );

  app.post(
    '/api/student/attempts/:attemptId/responses',
    verifyAccess, // Ensure the user is logged in (provides studentId)
    validate(submitAnswerSchema),
    attemptController.submitAnswerHandler // Call the controller
  )

  app.post(
    '/api/student/attempts/:attemptId/submit',
    verifyAccess, // 1. Ensure user is logged in
    // No validation middleware needed (no body)
    attemptController.submitAttemptHandler // 2. Run the controller
  );

  app.get(
    '/api/student/attempts/:attemptId',
    verifyAccess, // 1. Ensure user is logged in (provides studentId)
    // No validation middleware needed (ID is in URL)
    attemptController.getAttemptDetailsHandler // 2. Run the controller
  );

  app.get(
    '/api/student/attempts/:attemptId/results',
    verifyAccess, // 1. Ensures user is logged in (provides studentId)
    // No validation middleware needed (ID is in URL)
    attemptController.getAttemptResultsHandler // 2. Run the controller
  );
  // Add more attempt routes later (e.g., submit answer, submit attempt)
};