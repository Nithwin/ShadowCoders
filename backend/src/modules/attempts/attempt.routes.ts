import { Express } from 'express';
import { verifyAccess } from '../../middleware/auth';
import * as attemptController from './attempt.controller';

export const registerAttemptRoutes = (app: Express) => {
  app.post(
    '/api/student/exams/:examId/start',
    verifyAccess, // Ensure the user is logged in (provides studentId)
    // No role check needed - students perform this action
    // No validation needed - input comes from URL params and auth
    attemptController.startAttemptHandler // Call the controller
  );

  // Add more attempt routes later (e.g., submit answer, submit attempt)
};