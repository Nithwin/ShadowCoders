import { Express } from 'express';
import { verifyAccess } from '../../middleware/auth';
import { requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { runCodeSchema, autoGradeEssaySchema } from './grading.zod';
import * as gradingController from './grading.controller';

export const registerGradingRoutes = (app: Express) => {
  // Run code (for students)
  app.post(
    '/api/student/attempts/:attemptId/run-code',
    verifyAccess,
    validate(runCodeSchema),
    gradingController.runCodeHandler
  );

  // Auto-grade essay (for admins/staff)
  app.post(
    '/api/grading/essay',
    // authorize([Role.STAFF]), // Ensure only staff can trigger this
    validate(autoGradeEssaySchema),
    gradingController.gradeEssayHandler
  );

  // Queue status endpoint (public for students to check wait times)
  app.get(
    '/api/queue/status',
    gradingController.getQueueStatusHandler
  );

  // Override grade (for admins)
  app.put(
    '/api/grading/response/:responseId/override',
    requireRole('STAFF'),
    gradingController.overrideResponseGradeHandler
  );
};