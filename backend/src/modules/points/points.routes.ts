import { Express } from 'express';
import { verifyAccess, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as pointsController from './points.controller';
import { getPointsHistorySchema, adjustPointsSchema, addPointsByEmailSchema } from './points.zod';

export const registerPointsRoutes = (app: Express) => {
  // Student routes
  app.get(
    '/api/student/points',
    verifyAccess,
    pointsController.getMyPoints
  );
  
  app.get(
    '/api/student/points/history',
    verifyAccess,
    validate(getPointsHistorySchema),
    pointsController.getMyPointsHistory
  );
  
  // Admin routes
  app.post(
    '/api/admin/points/adjust',
    verifyAccess,
    requireRole('STAFF'),
    validate(adjustPointsSchema),
    pointsController.adjustPoints
  );

  // Admin route to add points by email (for testing)
  app.post(
    '/api/admin/points/add-by-email',
    verifyAccess,
    requireRole('STAFF'),
    validate(addPointsByEmailSchema),
    pointsController.addPointsByEmail
  );
};

