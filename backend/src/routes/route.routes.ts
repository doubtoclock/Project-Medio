import express from "express";
import { getRouteFromOTP } from "../controller/route.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = express.Router();

router.post("/route", authMiddleware, getRouteFromOTP);

export default router;
