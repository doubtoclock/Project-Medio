import { Router } from "express";
import { getMeetPoints } from "../controller/meet.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.post("/", authMiddleware, getMeetPoints);
router.post("/meet", authMiddleware, getMeetPoints);

export default router;
