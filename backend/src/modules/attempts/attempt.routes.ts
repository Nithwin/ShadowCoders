import { Express } from 'express';
import { requireRole, verifyAccess } from '../../middleware/auth';
import * as attemptController from './attempt.controller';
import { validate } from '../../middleware/validate';
import { listAttemptsSchema, submitAnswerSchema, resetAttemptsSchema, runCodeSchema, submitAttemptSchema } from './attempt.zod';

export const registerAttemptRoutes = (app: Express) => {
  app.post(
    '/api/student/exams/:examId/start',
    verifyAccess, 
    attemptController.startAttemptHandler
  );

  app.post(
    '/api/student/attempts/:attemptId/responses',
    verifyAccess,
    validate(submitAnswerSchema),
    attemptController.submitAnswerHandler
  );

  app.post(
    '/api/student/attempts/:attemptId/submit',
    verifyAccess,
    validate(submitAttemptSchema),
    attemptController.submitAttemptHandler
  );

  app.get(
    '/api/student/attempts',
    verifyAccess,
    attemptController.getStudentAttemptsHandler
  );

  app.get(
    '/api/student/attempts/:attemptId',
    verifyAccess,
    attemptController.getAttemptDetailsHandler
  );

  app.get(
    '/api/student/attempts/:attemptId/question/:questionId',
    verifyAccess,
    attemptController.getQuestionHandler
  );

  app.get(
    '/api/student/attempts/:attemptId/results',
    verifyAccess,
    attemptController.getAttemptResultsHandler
  );

  app.get(
    '/api/admin/attempts/exam/:examId',
    verifyAccess,
    requireRole('STAFF'),
    validate(listAttemptsSchema),
    attemptController.listAttemptsForExamHandler
  );

  app.get(
    '/api/admin/attempts/:attemptId',
    verifyAccess,
    requireRole('STAFF'),
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