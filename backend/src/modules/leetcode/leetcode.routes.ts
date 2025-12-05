import { Express, Router } from 'express';
import * as leetcodeController from './leetcode.controller';
import { verifyAccess, requireRole } from '../../middleware/auth';

export const registerLeetCodeRoutes = (app: Express) => {
    const router = Router();

    // All routes require authentication and STAFF (Admin) role
    router.use(verifyAccess);
    router.use(requireRole('STAFF'));

    router.post('/sync', leetcodeController.syncStats);
    router.get('/stats', leetcodeController.getLeaderboard);

    app.use('/api/leetcode', router);
};
