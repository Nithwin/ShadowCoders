import { Router } from "express";
import { getNextQuestionHandler } from "./adaptive.controller";
import { requireAuth } from "../../middleware/auth";

const router = Router();

// GET /api/exams/:examId/next-question
router.get("/:examId/next-question", requireAuth, getNextQuestionHandler);

export default router;
