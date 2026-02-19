import { Router } from "express";
import { getMeetPoints } from "../controller/meet.controller";

const router = Router();

router.post("/meet", getMeetPoints);

export default router;
