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
    app.put(
    '/api/admin/exams/:examId',
    verifyAccess,
    requireRole('STAFF'),
    validate(updateExamSchema), // 2. Use the update schema
    examController.updateExamHandler // 3. Use the update controller
  );

  // --- Student Route ---
  app.get(
    '/api/student/exams',
    verifyAccess,
    validate(studentListExamsSchema),
    examController.listExamsForStudentHandler
  );

  app.delete(
    '/api/admin/exams/:examId',
    verifyAccess,
    requireRole('STAFF'),
    // No Zod validation needed for a simple delete
    examController.deleteExamHandler
  );
}