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
exports.registerAnalyticsRoutes = void 0;
const auth_1 = require("../../middleware/auth");
const analyticsController = __importStar(require("./analytics.controller"));
const registerAnalyticsRoutes = (app) => {
    // Get comprehensive analytics for an exam
    app.get('/api/admin/exams/:examId/analytics', auth_1.verifyAccess, (0, auth_1.requireRole)('STAFF'), analyticsController.getExamAnalyticsHandler);
    // Get exam statistics only
    app.get('/api/admin/exams/:examId/analytics/statistics', auth_1.verifyAccess, (0, auth_1.requireRole)('STAFF'), analyticsController.getExamStatisticsHandler);
    // Get question performance metrics
    app.get('/api/admin/exams/:examId/analytics/questions', auth_1.verifyAccess, (0, auth_1.requireRole)('STAFF'), analyticsController.getQuestionMetricsHandler);
    // Get student performance trends
    app.get('/api/admin/exams/:examId/analytics/trends', auth_1.verifyAccess, (0, auth_1.requireRole)('STAFF'), analyticsController.getPerformanceTrendsHandler);
    // Get time spent analysis
    app.get('/api/admin/exams/:examId/analytics/time', auth_1.verifyAccess, (0, auth_1.requireRole)('STAFF'), analyticsController.getTimeAnalysisHandler);
};
exports.registerAnalyticsRoutes = registerAnalyticsRoutes;
//# sourceMappingURL=analytics.routes.js.map