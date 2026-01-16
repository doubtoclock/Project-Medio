import { Router } from "express";
import { calculateMeetPoint } from "../controller/meetpoint.controller";

const router = Router();

// POST /api/meetpoint
router.post("/meetpoint", calculateMeetPoint);

export default router;
