"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTimeAnalysisHandler = exports.getPerformanceTrendsHandler = exports.getQuestionMetricsHandler = exports.getExamStatisticsHandler = exports.getExamAnalyticsHandler = void 0;
const analyticsService = __importStar(require("./analytics.service"));
const getExamAnalyticsHandler = async (req, res, next) => {
    try {
        const examId = req.params.examId;
        if (!examId) {
            return next({ status: 400, message: 'Missing examId parameter' });
        }
        const analytics = await analyticsService.getExamAnalytics(examId);
        res.status(200).json(analytics);
    }
    catch (error) {
        if (error.status) {
            return next(error);
        }
        if (process.env.NODE_ENV === 'development') {
            console.error('Error fetching exam analytics:', error);
        }
        next({ status: 500, message: 'Failed to fetch exam analytics' });
    }
};
exports.getExamAnalyticsHandler = getExamAnalyticsHandler;
const getExamStatisticsHandler = async (req, res, next) => {
    try {
        const examId = req.params.examId;
        if (!examId) {
            return next({ status: 400, message: 'Missing examId parameter' });
        }
        const statistics = await analyticsService.getExamStatistics(examId);
        res.status(200).json(statistics);
    }
    catch (error) {
        if (error.status) {
            return next(error);
        }
        if (process.env.NODE_ENV === 'development') {
            console.error('Error fetching exam statistics:', error);
        }
        next({ status: 500, message: 'Failed to fetch exam statistics' });
    }
};
exports.getExamStatisticsHandler = getExamStatisticsHandler;
const getQuestionMetricsHandler = async (req, res, next) => {
    try {
        const examId = req.params.examId;
        if (!examId) {
            return next({ status: 400, message: 'Missing examId parameter' });
        }
        const metrics = await analyticsService.getQuestionPerformanceMetrics(examId);
        res.status(200).json(metrics);
    }
    catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('Error fetching question metrics:', error);
        }
        next({ status: 500, message: 'Failed to fetch question metrics' });
    }
};
exports.getQuestionMetricsHandler = getQuestionMetricsHandler;
const getPerformanceTrendsHandler = async (req, res, next) => {
    try {
        const examId = req.params.examId;
        if (!examId) {
            return next({ status: 400, message: 'Missing examId parameter' });
        }
        const trends = await analyticsService.getStudentPerformanceTrends(examId);
        res.status(200).json(trends);
    }
    catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('Error fetching performance trends:', error);
        }
        next({ status: 500, message: 'Failed to fetch performance trends' });
    }
};
exports.getPerformanceTrendsHandler = getPerformanceTrendsHandler;
const getTimeAnalysisHandler = async (req, res, next) => {
    try {
        const examId = req.params.examId;
        if (!examId) {
            return next({ status: 400, message: 'Missing examId parameter' });
        }
        const analysis = await analyticsService.getTimeSpentAnalysis(examId);
        res.status(200).json(analysis);
    }
    catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('Error fetching time analysis:', error);
        }
        next({ status: 500, message: 'Failed to fetch time analysis' });
    }
};
exports.getTimeAnalysisHandler = getTimeAnalysisHandler;
//# sourceMappingURL=analytics.controller.js.map