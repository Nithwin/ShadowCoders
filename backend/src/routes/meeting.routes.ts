import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { createMeeting, listMeetings, getMeeting, joinMeeting, generateSummary, deleteMeeting, updateMeeting } from '../controllers/meeting.controller';

const router = Router();

// Public/All authenticated users
router.get('/', authenticate, listMeetings);
router.get('/:id', authenticate, getMeeting);
router.post('/:id/join', authenticate, joinMeeting);

// Admin/Staff only
router.post('/', authenticate, authorize(['ADMIN', 'STAFF']), createMeeting);
router.put('/:id', authenticate, authorize(['ADMIN', 'STAFF']), updateMeeting);
router.delete('/:id', authenticate, authorize(['ADMIN', 'STAFF']), deleteMeeting);
router.post('/:id/summarize', authenticate, authorize(['ADMIN', 'STAFF']), generateSummary);

export const registerMeetingRoutes = (app: any) => {
  app.use('/api/meetings', router);
};
