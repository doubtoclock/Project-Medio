import express from "express";
import { getRouteFromOTP } from "../controller/route.controller";

const router = express.Router();

router.post("/route", getRouteFromOTP);

export default router;