import { Router } from "express";
import { register, login } from "../controller/auth.controller";

const router = Router();

/**
 * Auth Routes
 * Base path: /auth
 */
router.post("/register", register);
router.post("/login", login);

export default router;
