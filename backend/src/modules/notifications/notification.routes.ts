import { Router } from 'express';
import { verifyAccess } from '../../middleware/auth';
import * as notificationController from './notification.controller';

const router = Router();

router.use(verifyAccess);

router.get('/', notificationController.getNotifications);
router.put('/:id/read', notificationController.markAsRead);
router.put('/read-all', notificationController.markAllAsRead);

export default router;
