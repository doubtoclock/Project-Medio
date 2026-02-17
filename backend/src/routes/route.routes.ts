import express from "express";
import { getRouteFromOTP } from "../controller/route.controller";

const router = express.Router();

router.get("/route", getRouteFromOTP);

export default router;
