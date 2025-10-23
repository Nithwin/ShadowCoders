import { Express } from "express";
import { requireRole, verifyAccess } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { createExamSchema } from "./exam.zod";
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
        validate(createExamSchema),
        examController.assignExamHandler
    );
    
    app.post(
        '/api/admin/exams/:examId/publish',
        verifyAccess,
        requireRole('STAFF'),
        examController.publishExamHandler
    );
}