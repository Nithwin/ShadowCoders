import { Express } from 'express';
import { verifyAccess } from '../../middleware/auth';
import { requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { generateQuestionsSchema } from './ai.zod';
import * as aiController from './ai.controller';

export const registerAiRoutes = (app: Express) => {
  app.post(
    '/api/admin/ai/generate-questions',
    verifyAccess,
    requireRole('STAFF'),
    validate(generateQuestionsSchema),
    aiController.generateQuestionsHandler
  );
};