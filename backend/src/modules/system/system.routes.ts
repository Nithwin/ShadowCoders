import { Express } from 'express';
import { requireRole, verifyAccess } from '../../middleware/auth';
import * as systemController from './system.controller';

export const registerSystemRoutes = (app: Express) => {
    // Get system resource metrics (CPU, Memory, Disk, Network)
    app.get(
        '/api/admin/system/resources',
        verifyAccess,
        requireRole('STAFF'),
        systemController.getSystemResourcesHandler
    );
};

