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
exports.registerExamRoutes = void 0;
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const exam_zod_1 = require("./exam.zod");
const examController = __importStar(require("./exam.controller"));
const registerExamRoutes = (app) => {
    app.post('/api/admin/exams', auth_1.verifyAccess, (0, auth_1.requireRole)('STAFF'), (0, validate_1.validate)(exam_zod_1.createExamSchema), examController.createExamHandler);
    app.post('/api/admin/exams/:examId/assign', auth_1.verifyAccess, (0, auth_1.requireRole)('STAFF'), (0, validate_1.validate)(exam_zod_1.assignExamSchema), examController.assignExamHandler);
    app.delete('/api/admin/exams/:examId/assignments/:assignmentId', auth_1.verifyAccess, (0, auth_1.requireRole)('STAFF'), examController.deleteAssignmentHandler);
    app.post('/api/admin/exams/:examId/publish', auth_1.verifyAccess, (0, auth_1.requireRole)('STAFF'), examController.publishExamHandler);
    app.get('/api/admin/exams', auth_1.verifyAccess, (0, auth_1.requireRole)('STAFF'), (0, validate_1.validate)(exam_zod_1.listExamsSchema), examController.listExamsHandler);
    app.get('/api/student/exams', auth_1.verifyAccess, (0, validate_1.validate)(exam_zod_1.studentListExamsSchema), examController.studentListExamsHandler);
    // Export exam results to Excel (MUST come before :examId routes)
    app.get('/api/admin/exams/:examId/export', auth_1.verifyAccess, (0, auth_1.requireRole)('STAFF'), examController.exportExamResultsHandler);
    // Single exam fetch for edit page
    app.get('/api/admin/exams/:examId', auth_1.verifyAccess, (0, auth_1.requireRole)('STAFF'), examController.getExamByIdHandler);
    // Single exam fetch for students (with access control)
    app.get('/api/student/exams/:examId', auth_1.verifyAccess, examController.getExamByIdForStudentHandler);
    app.put('/api/admin/exams/:examId', auth_1.verifyAccess, (0, auth_1.requireRole)('STAFF'), (0, validate_1.validate)(exam_zod_1.updateExamSchema), examController.updateExamHandler);
    app.patch('/api/admin/exams/:examId/release-results', auth_1.verifyAccess, (0, auth_1.requireRole)('STAFF'), examController.toggleResultLockHandler);
    app.delete('/api/admin/exams/:examId', auth_1.verifyAccess, (0, auth_1.requireRole)('STAFF'), examController.deleteExamHandler);
};
exports.registerExamRoutes = registerExamRoutes;
//# sourceMappingURL=exam.routes.js.map