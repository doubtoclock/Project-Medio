import express from "express";
import { getRouteFromOTP } from "../controller/route.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { validateBody } from "../middlewares/validation.middleware";
import { routeRequestSchema } from "../validators/api.validator";

const router = express.Router();

router.post("/route", authMiddleware, validateBody(routeRequestSchema), getRouteFromOTP);

export default router;
