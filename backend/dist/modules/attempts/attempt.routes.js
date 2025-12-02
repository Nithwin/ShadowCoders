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
    app.post('/api/student/exams/:examId/start', auth_1.verifyAccess, attemptController.startAttemptHandler // Call the controller
    );
    app.post('/api/student/attempts/:attemptId/responses', auth_1.verifyAccess, // Ensure the user is logged in (provides studentId)
    (0, validate_1.validate)(attempt_zod_1.submitAnswerSchema), attemptController.submitAnswerHandler // Call the controller
    );
    app.post('/api/student/attempts/:attemptId/submit', auth_1.verifyAccess, // 1. Ensure user is logged in
    // No validation middleware needed (no body)
    attemptController.submitAttemptHandler // 2. Run the controller
    );
    // IMPORTANT: This route must come BEFORE /api/student/attempts/:attemptId
    // to avoid route conflicts (Express matches routes in order)
    app.get('/api/student/attempts', auth_1.verifyAccess, // 1. Ensures user is logged in (provides studentId)
    attemptController.getStudentAttemptsHandler // 2. Run the controller
    );
    app.get('/api/student/attempts/:attemptId', auth_1.verifyAccess, // 1. Ensure user is logged in (provides studentId)
    // No validation middleware needed (ID is in URL)
    attemptController.getAttemptDetailsHandler // 2. Run the controller
    );
    app.get('/api/student/attempts/:attemptId/question/:questionId', auth_1.verifyAccess, // 1. Ensure user is logged in (provides studentId)
    // No validation middleware needed (IDs are in URL)
    attemptController.getQuestionHandler // 2. Run the controller
    );
    app.get('/api/student/attempts/:attemptId/results', auth_1.verifyAccess, // 1. Ensures user is logged in (provides studentId)
    // No validation middleware needed (ID is in URL)
    attemptController.getAttemptResultsHandler // 2. Run the controller
    );
    app.get('/api/admin/attempts/exam/:examId', // The new admin route
    auth_1.verifyAccess, (0, auth_1.requireRole)('STAFF'), // 1. Must be logged in
    (0, validate_1.validate)(attempt_zod_1.listAttemptsSchema), // 2. Must be staff
    attemptController.listAttemptsForExamHandler // 3. Run the controller
    );
    app.get('/api/admin/attempts/:attemptId', auth_1.verifyAccess, (0, auth_1.requireRole)('STAFF'), 
    // No validation needed for this simple GET request
    attemptController.getAttemptForAdminHandler);
    app.post('/api/admin/attempts/reset', auth_1.verifyAccess, (0, auth_1.requireRole)('STAFF'), (0, validate_1.validate)(attempt_zod_1.resetAttemptsSchema), attemptController.resetAttemptsHandler);
};
exports.registerAttemptRoutes = registerAttemptRoutes;
//# sourceMappingURL=attempt.routes.js.map