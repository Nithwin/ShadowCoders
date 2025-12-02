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
exports.registerQuestionRoutes = void 0;
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const question_zod_1 = require("./question.zod");
const questionController = __importStar(require("./question.controller"));
const registerQuestionRoutes = (app) => {
    // --- Add this new route ---
    app.get('/api/admin/exams/:examId/questions', auth_1.verifyAccess, (0, auth_1.requireRole)('STAFF'), questionController.listQuestionsForExamHandler);
    app.post('/api/admin/exams/:examId/questions', auth_1.verifyAccess, (0, auth_1.requireRole)('STAFF'), (0, validate_1.validate)(question_zod_1.addQuestionsSchema), questionController.addQuestionsHandler);
    app.get('/api/student/attempts/:attemptId/question/:questionId', auth_1.verifyAccess, // 1. Ensures user is logged in (provides studentId)
    // No validation needed for params, handled in controller/service
    questionController.getQuestionHandler // 2. Run the controller
    );
    app.put('/api/admin/questions/:questionId', auth_1.verifyAccess, (0, auth_1.requireRole)('STAFF'), (0, validate_1.validate)(question_zod_1.updateQuestionSchema), questionController.updateQuestionHandler);
    app.delete('/api/admin/questions/:questionId', auth_1.verifyAccess, (0, auth_1.requireRole)('STAFF'), 
    // No Zod validation needed for a simple delete
    questionController.deleteQuestionHandler);
};
exports.registerQuestionRoutes = registerQuestionRoutes;
//# sourceMappingURL=question.routes.js.map