import { Express } from 'express';
import { verifyAccess } from '../../middleware/auth';
import { requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { addQuestionsToSectionSchema, createSectionSchema, updateSectionSchema } from './section.zod';
import * as sectionController from './section.controller';

export const registerSectionRoutes = (app: Express) => {
  // Get all sections for an exam
  app.get(
    '/api/admin/exams/:examId/sections',
    verifyAccess,
    requireRole('STAFF'),
    sectionController.listSectionsForExamHandler
  );

  app.post(
    '/api/admin/exams/:examId/sections',
    verifyAccess,                 // 1. Must be logged in
    requireRole('STAFF'),         // 2. Must be staff
    validate(createSectionSchema), // 3. Data must be valid
    sectionController.createSectionHandler // 4. Run the controller
  );

  app.post(
    '/api/admin/sections/:sectionId/questions',
    verifyAccess,
    requireRole('STAFF'),
    validate(addQuestionsToSectionSchema),
    sectionController.addQuestionsToSectionHandler
  );

  app.put(
    '/api/admin/sections/:sectionId',
    verifyAccess,
    requireRole('STAFF'),
    validate(updateSectionSchema),
    sectionController.updateSectionHandler
  );

  app.delete(
  '/api/admin/sections/:sectionId',
  verifyAccess,
  requireRole('STAFF'),
  // No Zod validation needed for a simple delete
  sectionController.deleteSectionHandler
);

app.delete(
  '/api/admin/sections/:sectionId/questions/:questionId',
  verifyAccess,
  requireRole('STAFF'),
  // No Zod validation needed, IDs are in params
  sectionController.removeQuestionFromSectionHandler
);
  // We can add routes for GET, PUT, DELETE for sections here later
};

