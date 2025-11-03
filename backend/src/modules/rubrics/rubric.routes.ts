import { Express } from 'express';
import { verifyAccess } from '../../middleware/auth';
import { requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createRubricSchema } from './rubric.zod';
import * as rubricController from './rubric.controller';

export const registerRubricRoutes = (app: Express) => {
  app.post(
    '/api/admin/rubrics',
    verifyAccess,                 // 1. Must be logged in
    requireRole('STAFF'),         // 2. Must be staff
    validate(createRubricSchema), // 3. Data must be valid
    rubricController.createRubricHandler // 4. Run the controller
  );

  // We can add routes for GET, PUT, DELETE for rubrics here later
};