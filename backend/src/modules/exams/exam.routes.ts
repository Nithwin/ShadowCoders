import { Express } from "express";
import { requireRole, verifyAccess } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { assignExamSchema, createExamSchema, listExamsSchema, studentListExamsSchema, updateExamSchema } from "./exam.zod";
import * as examController from "./exam.controller";


export const registerExamRoutes = (app: Express) => {
    app.post(
        '/api/admin/exams',
        verifyAccess,
        requireRole('STAFF'),
        validate(createExamSchema),
        examController.createExamHandler
    );

    app.post(
        '/api/admin/exams/:examId/assign',
        verifyAccess,
        requireRole('STAFF'),
        validate(assignExamSchema),
        examController.assignExamHandler
    );

    app.delete(
        '/api/admin/exams/:examId/assignments/:assignmentId',
        verifyAccess,
        requireRole('STAFF'),
        examController.deleteAssignmentHandler
    );
    
    app.post(
        '/api/admin/exams/:examId/publish',
        verifyAccess,
        requireRole('STAFF'),
        examController.publishExamHandler
    );

    app.post(
        '/api/admin/exams/:examId/generate',
        verifyAccess,
        requireRole('STAFF'),
        examController.triggerGenerationHandler
    );

    app.get(
        '/api/admin/exams',
        verifyAccess,
        requireRole('STAFF'),
        validate(listExamsSchema),
        examController.listExamsHandler
    );

    app.get(
        '/api/student/exams',
        verifyAccess,
        validate(studentListExamsSchema),
        examController.studentListExamsHandler
    );

    // Export exam results to Excel (MUST come before :examId routes)
    app.get(
        '/api/admin/exams/:examId/export',
        verifyAccess,
        requireRole('STAFF'),
        examController.exportExamResultsHandler
    );

    // Single exam fetch for edit page
    app.get(
        '/api/admin/exams/:examId',
        verifyAccess,
        requireRole('STAFF'),
        examController.getExamByIdHandler
    );

    // Single exam fetch for students (with access control)
    app.get(
        '/api/student/exams/:examId',
        verifyAccess,
        examController.getExamByIdForStudentHandler
    );

    app.put(
        '/api/admin/exams/:examId',
        verifyAccess,
        requireRole('STAFF'),
        validate(updateExamSchema),
        examController.updateExamHandler
    );

    app.patch(
        '/api/admin/exams/:examId/release-results',
        verifyAccess,
        requireRole('STAFF'),
        examController.toggleResultLockHandler
    );

    app.delete(
        '/api/admin/exams/:examId',
        verifyAccess,
        requireRole('STAFF'),
        examController.deleteExamHandler
    );
}