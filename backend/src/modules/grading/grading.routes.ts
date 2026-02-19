import { Express } from 'express';
import { verifyAccess } from '../../middleware/auth';
import { requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { runCodeSchema, autoGradeEssaySchema } from './grading.zod';
import * as gradingController from './grading.controller';
import { throttleCodeSubmission } from '../../middleware/throttle';
import { validateCodeInput } from '../../middleware/input-validation';

export const registerGradingRoutes = (app: Express) => {
  // Run code (for students) — with per-user throttle + input validation
  app.post(
    '/api/student/attempts/:attemptId/run-code',
    verifyAccess,
    throttleCodeSubmission,
    validateCodeInput,
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