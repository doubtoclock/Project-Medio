import { Router } from "express";
import { calculateMeetPoint } from "../controller/meetpoint.controller";

const router = Router();

// POST /api/meeting-point
router.post("/", calculateMeetPoint);

export default router;
