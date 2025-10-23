import { Express } from "express";
import { requireRole, verifyAccess } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { assignExamSchema, createExamSchema, listExamsSchema, studentListExamsSchema } from "./exam.zod";
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
    
    app.post(
        '/api/admin/exams/:examId/publish',
        verifyAccess,
        requireRole('STAFF'),
        examController.publishExamHandler
    );

    app.get(
        '/api/admin/exams',
        verifyAccess,
        requireRole('STAFF'),
        validate(listExamsSchema),
        examController.listExamsHandler
    )

    app.get(
        '/api/student/exams',
        verifyAccess,
        validate(studentListExamsSchema),
        examController.listExamsForStudentHandler
    )
}