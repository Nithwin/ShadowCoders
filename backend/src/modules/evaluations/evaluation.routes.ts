import { Express } from 'express';
import { verifyAccess } from '../../middleware/auth';
import { requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createEvaluationSchema } from './evaluation.zod';
import * as evaluationController from './evaluation.controller';

export const registerEvaluationRoutes = (app: Express) => {
  app.post(
    '/api/admin/responses/:responseId/evaluate',
    verifyAccess,                 // 1. Must be logged in
    requireRole('STAFF'),         // 2. Must be staff
    validate(createEvaluationSchema), // 3. Data must be valid
    evaluationController.createManualEvaluationHandler // 4. Run the controller
  );
};