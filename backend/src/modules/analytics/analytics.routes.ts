import { Express } from 'express';
import { requireRole, verifyAccess } from '../../middleware/auth';
import * as analyticsController from './analytics.controller';
import * as activityController from './activity.controller';

export const registerAnalyticsRoutes = (app: Express) => {
  // Get comprehensive analytics for an exam
  app.get(
    '/api/admin/exams/:examId/analytics',
    verifyAccess,
    requireRole('STAFF'),
    analyticsController.getExamAnalyticsHandler
  );

  // Get exam statistics only
  app.get(
    '/api/admin/exams/:examId/analytics/statistics',
    verifyAccess,
    requireRole('STAFF'),
    analyticsController.getExamStatisticsHandler
  );

  // Get question performance metrics
  app.get(
    '/api/admin/exams/:examId/analytics/questions',
    verifyAccess,
    requireRole('STAFF'),
    analyticsController.getQuestionMetricsHandler
  );

  // Get student performance trends
  app.get(
    '/api/admin/exams/:examId/analytics/trends',
    verifyAccess,
    requireRole('STAFF'),
    analyticsController.getPerformanceTrendsHandler
  );

  // Get time spent analysis
  app.get(
    '/api/admin/exams/:examId/analytics/time',
    verifyAccess,
    requireRole('STAFF'),
    analyticsController.getTimeAnalysisHandler
  );

  // NEW: Global leaderboard
  app.get(
    '/api/admin/analytics/leaderboard',
    verifyAccess,
    requireRole('STAFF'),
    analyticsController.getGlobalLeaderboardHandler
  );

  // NEW: Dashboard overview statistics
  app.get(
    '/api/admin/analytics/overview',
    verifyAccess,
    requireRole('STAFF'),
    analyticsController.getDashboardOverviewHandler
  );

  // NEW: Student personal insights
  app.get(
    '/api/student/analytics/insights',
    verifyAccess,
    analyticsController.getStudentInsightsHandler
  );

  // Student activity routes
  app.get(
    '/api/student/activity',
    verifyAccess,
    activityController.getUserActivityHandler
  );

  app.get(
    '/api/student/stats',
    verifyAccess,
    activityController.getUserStatsHandler
  );
};
