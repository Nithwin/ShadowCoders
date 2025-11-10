import { Express } from 'express';
import { verifyAccess } from '../../middleware/auth';
import { requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createRubricSchema, updateRubricSchema, listRubricsSchema } from './rubric.zod';
import * as rubricController from './rubric.controller';

export const registerRubricRoutes = (app: Express) => {
  // List all rubrics
  app.get(
    '/api/admin/rubrics',
    verifyAccess,
    requireRole('STAFF'),
    validate(listRubricsSchema),
    rubricController.listRubricsHandler
  );

  // Get a single rubric
  app.get(
    '/api/admin/rubrics/:rubricId',
    verifyAccess,
    requireRole('STAFF'),
    rubricController.getRubricByIdHandler
  );

  // Create a new rubric
  app.post(
    '/api/admin/rubrics',
    verifyAccess,
    requireRole('STAFF'),
    validate(createRubricSchema),
    rubricController.createRubricHandler
  );

  // Update a rubric
  app.put(
    '/api/admin/rubrics/:rubricId',
    verifyAccess,
    requireRole('STAFF'),
    validate(updateRubricSchema),
    rubricController.updateRubricHandler
  );

  // Delete a rubric
  app.delete(
    '/api/admin/rubrics/:rubricId',
    verifyAccess,
    requireRole('STAFF'),
    rubricController.deleteRubricHandler
  );
};