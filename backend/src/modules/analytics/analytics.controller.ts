import { RequestHandler } from 'express';
import * as analyticsService from './analytics.service';

export const getExamAnalyticsHandler: RequestHandler = async (req, res, next) => {
  try {
    const examId = req.params.examId;
    const analytics = await analyticsService.getExamAnalytics(examId);
    res.status(200).json(analytics);
  } catch (error: any) {
    if (error.status) {
      return next(error);
    }
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching exam analytics:', error);
    }
    next({ status: 500, message: 'Failed to fetch exam analytics' });
  }
};

export const getExamStatisticsHandler: RequestHandler = async (req, res, next) => {
  try {
    const examId = req.params.examId;
    const statistics = await analyticsService.getExamStatistics(examId);
    res.status(200).json(statistics);
  } catch (error: any) {
    if (error.status) {
      return next(error);
    }
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching exam statistics:', error);
    }
    next({ status: 500, message: 'Failed to fetch exam statistics' });
  }
};

export const getQuestionMetricsHandler: RequestHandler = async (req, res, next) => {
  try {
    const examId = req.params.examId;
    const metrics = await analyticsService.getQuestionPerformanceMetrics(examId);
    res.status(200).json(metrics);
  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching question metrics:', error);
    }
    next({ status: 500, message: 'Failed to fetch question metrics' });
  }
};

export const getPerformanceTrendsHandler: RequestHandler = async (req, res, next) => {
  try {
    const examId = req.params.examId;
    const trends = await analyticsService.getStudentPerformanceTrends(examId);
    res.status(200).json(trends);
  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching performance trends:', error);
    }
    next({ status: 500, message: 'Failed to fetch performance trends' });
  }
};

export const getTimeAnalysisHandler: RequestHandler = async (req, res, next) => {
  try {
    const examId = req.params.examId;
    const analysis = await analyticsService.getTimeSpentAnalysis(examId);
    res.status(200).json(analysis);
  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching time analysis:', error);
    }
    next({ status: 500, message: 'Failed to fetch time analysis' });
  }
};

