import { Router } from 'express';
import { verifyAccess as authenticate, requireRole as authorize } from '../../middleware/auth';
import { Role } from '@prisma/client';
import * as reportController from './report.controller';

const router = Router();

// Student can create report
router.post('/', authenticate, reportController.createReport);

// Admin routes
router.get('/', authenticate, authorize(Role.STAFF), reportController.getReports);
router.patch('/:reportId/status', authenticate, authorize(Role.STAFF), reportController.updateReportStatus);

export const reportRoutes = router;
