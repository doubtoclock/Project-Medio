import express from "express";
import { getRouteFromOTP } from "../controller/route.controller";
import { validateBody } from "../middlewares/validation.middleware";
import { routeRequestSchema } from "../validators/api.validator";

const router = express.Router();

// Travel is available to guests; signed-in users still have route history recorded.
router.post("/route", validateBody(routeRequestSchema), getRouteFromOTP);

export default router;
