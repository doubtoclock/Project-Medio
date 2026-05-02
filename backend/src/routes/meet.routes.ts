import { Router } from "express";
import { getMeetPoints } from "../controller/meet.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { validateBody } from "../middlewares/validation.middleware";
import { meetRequestSchema } from "../validators/api.validator";

const router = Router();

router.post("/", authMiddleware, validateBody(meetRequestSchema), getMeetPoints);
router.post(
  "/meet",
  authMiddleware,
  validateBody(meetRequestSchema),
  getMeetPoints
);

export default router;
