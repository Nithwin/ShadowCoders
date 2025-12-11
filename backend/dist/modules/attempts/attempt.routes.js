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
exports.registerAttemptRoutes = void 0;
const auth_1 = require("../../middleware/auth");
const attemptController = __importStar(require("./attempt.controller"));
const validate_1 = require("../../middleware/validate");
const attempt_zod_1 = require("./attempt.zod");
const registerAttemptRoutes = (app) => {
    app.post('/api/student/exams/:examId/start', auth_1.verifyAccess, attemptController.startAttemptHandler);
    app.post('/api/student/attempts/:attemptId/responses', auth_1.verifyAccess, (0, validate_1.validate)(attempt_zod_1.submitAnswerSchema), attemptController.submitAnswerHandler);
    app.post('/api/student/attempts/:attemptId/submit', auth_1.verifyAccess, (0, validate_1.validate)(attempt_zod_1.submitAttemptSchema), attemptController.submitAttemptHandler);
    app.get('/api/student/attempts', auth_1.verifyAccess, attemptController.getStudentAttemptsHandler);
    app.get('/api/student/attempts/:attemptId', auth_1.verifyAccess, attemptController.getAttemptDetailsHandler);
    app.get('/api/student/attempts/:attemptId/question/:questionId', auth_1.verifyAccess, attemptController.getQuestionHandler);
    app.get('/api/student/attempts/:attemptId/results', auth_1.verifyAccess, attemptController.getAttemptResultsHandler);
    app.get('/api/admin/attempts/exam/:examId', auth_1.verifyAccess, (0, auth_1.requireRole)('STAFF'), (0, validate_1.validate)(attempt_zod_1.listAttemptsSchema), attemptController.listAttemptsForExamHandler);
    app.get('/api/admin/attempts/:attemptId', auth_1.verifyAccess, (0, auth_1.requireRole)('STAFF'), attemptController.getAttemptForAdminHandler);
    app.post('/api/admin/attempts/reset', auth_1.verifyAccess, (0, auth_1.requireRole)('STAFF'), (0, validate_1.validate)(attempt_zod_1.resetAttemptsSchema), attemptController.resetAttemptsHandler);
    app.post('/api/admin/attempts/:attemptId/force-submit', auth_1.verifyAccess, (0, auth_1.requireRole)('STAFF'), (0, validate_1.validate)(attempt_zod_1.forceSubmitAttemptSchema), attemptController.forceSubmitAttemptHandler);
};
exports.registerAttemptRoutes = registerAttemptRoutes;
//# sourceMappingURL=attempt.routes.js.map