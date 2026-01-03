import { Router } from "express";
import { register, login } from "../controller/auth.controller";

const router = Router();

/**
 * Auth Routes
 */
router.post("/register", register);
router.post("/login", login);

export default router;
