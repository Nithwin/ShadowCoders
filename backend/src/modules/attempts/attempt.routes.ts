import { Express } from 'express';
import { requireRole, verifyAccess } from '../../middleware/auth';
import * as attemptController from './attempt.controller';
import { validate } from '../../middleware/validate';
import { listAttemptsSchema, submitAnswerSchema, resetAttemptsSchema } from './attempt.zod';

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

  // IMPORTANT: This route must come BEFORE /api/student/attempts/:attemptId
  // to avoid route conflicts (Express matches routes in order)
  app.get(
    '/api/student/attempts',
    verifyAccess, // 1. Ensures user is logged in (provides studentId)
    attemptController.getStudentAttemptsHandler // 2. Run the controller
  );

  app.get(
    '/api/student/attempts/:attemptId',
    verifyAccess, // 1. Ensure user is logged in (provides studentId)
    // No validation middleware needed (ID is in URL)
    attemptController.getAttemptDetailsHandler // 2. Run the controller
  );

  app.get(
    '/api/student/attempts/:attemptId/question/:questionId',
    verifyAccess, // 1. Ensure user is logged in (provides studentId)
    // No validation middleware needed (IDs are in URL)
    attemptController.getQuestionHandler // 2. Run the controller
  );

  app.get(
    '/api/student/attempts/:attemptId/results',
    verifyAccess, // 1. Ensures user is logged in (provides studentId)
    // No validation middleware needed (ID is in URL)
    attemptController.getAttemptResultsHandler // 2. Run the controller
  );

  app.get(
    '/api/admin/attempts/exam/:examId', // The new admin route
    verifyAccess,
    requireRole('STAFF'),        // 1. Must be logged in
    validate(listAttemptsSchema), // 2. Must be staff
    attemptController.listAttemptsForExamHandler // 3. Run the controller
  );

  app.get(
    '/api/admin/attempts/:attemptId',
    verifyAccess,
    requireRole('STAFF'),
    // No validation needed for this simple GET request
    attemptController.getAttemptForAdminHandler
  );

  app.post(
    '/api/admin/attempts/reset',
    verifyAccess,
    requireRole('STAFF'),
    validate(resetAttemptsSchema),
    attemptController.resetAttemptsHandler
  );
};