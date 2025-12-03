import { Router } from "express";
import * as templateController from "./exam-template.controller";
import { verifyAccess, requireRole } from "../../../middleware/auth";
import { Role } from "@prisma/client";

const router = Router();

// Create template from existing exam
router.post(
  "/exams/:examId/template",
  verifyAccess,
  requireRole(Role.STAFF),
  templateController.createTemplateFromExam
);

// Create exam from template
router.post(
  "/templates/:templateId/exam",
  verifyAccess,
  requireRole(Role.STAFF),
  templateController.createExamFromTemplate
);

// List templates
router.get(
  "/templates",
  verifyAccess,
  requireRole(Role.STAFF),
  templateController.listTemplates
);

// Delete template
router.delete(
  "/templates/:templateId",
  verifyAccess,
  requireRole(Role.STAFF),
  templateController.deleteTemplate
);

// Get single template
router.get(
  "/templates/:templateId",
  verifyAccess,
  requireRole(Role.STAFF),
  templateController.getTemplateById
);

export const registerTemplateRoutes = (app: any) => {
  app.use("/api/admin", router);
};
