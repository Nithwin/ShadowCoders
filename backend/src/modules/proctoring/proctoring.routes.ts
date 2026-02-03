import { Router } from 'express';
import { proctoringController } from './proctoring.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

// All proctoring routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/proctoring/events
 * @desc    Record a proctoring event (eye tracking, head tracking, etc.)
 * @access  Private (Student during exam)
 */
router.post('/events', proctoringController.recordEvent.bind(proctoringController));

/**
 * @route   GET /api/proctoring/events/:attemptId
 * @desc    Get all proctoring events for an attempt
 * @access  Private (Student/Admin)
 */
router.get('/events/:attemptId', proctoringController.getEvents.bind(proctoringController));

/**
 * @route   GET /api/proctoring/stats/:attemptId
 * @desc    Get proctoring statistics for an attempt
 * @access  Private (Student/Admin)
 */
router.get('/stats/:attemptId', proctoringController.getStats.bind(proctoringController));

/**
 * @route   GET /api/proctoring/recent/:attemptId
 * @desc    Get recent proctoring events for an attempt
 * @access  Private (Student/Admin)
 */
router.get('/recent/:attemptId', proctoringController.getRecentEvents.bind(proctoringController));

export default router;
