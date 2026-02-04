import { Router } from "express";
import { generatePoolHandler } from "./generation.controller";
import { requireAuth, authorize } from "../../middleware/auth";

const router = Router();

// POST /api/generation/pool/bulk
router.post("/pool/bulk", requireAuth, authorize(["ADMIN"]), generatePoolHandler);

export default router;
