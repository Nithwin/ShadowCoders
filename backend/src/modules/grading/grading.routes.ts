import { Express } from 'express';
import { verifyAccess } from '../../middleware/auth';
import { requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { runCodeSchema } from './grading.zod';
import * as gradingController from './grading.controller';

export const registerGradingRoutes = (app: Express) => {
  app.post(
    '/api/student/attempts/:attemptId/run-code',
    verifyAccess, // 1. Must be logged in
    validate(runCodeSchema), // 2. Validate the request body
    gradingController.runCodeHandler // 3. Run the controller
  );

  // Queue status endpoint (public for students to check wait times)
  app.get(
    '/api/queue/status',
    gradingController.getQueueStatusHandler
  );
};