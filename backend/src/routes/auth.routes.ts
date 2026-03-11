import { Router, Request, Response } from "express";
import {
  register,
  login,
  googleRedirectLogin,
  googleRedirectCallback,
  checkAuth,
  logout,
} from "../controller/auth.controller";

import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

console.log("✅ auth.routes.ts loaded");

/**
 * =========================
 * Auth Routes
 * Base path: /api/auth
 * =========================
 */

/* =========================
   TEST ROUTE
========================= */
router.get("/test", (_req: Request, res: Response) => {
  res.send("AUTH ROUTES WORKING");
});

/* =========================
   EMAIL / PASSWORD AUTH
========================= */

// Register
router.post("/register", register);

// Login
router.post("/login", login);

/* =========================
   GOOGLE AUTH (OAUTH)
========================= */

// STEP 1: Redirect user to Google
// Frontend hits: GET /api/auth/google
router.get("/google", googleRedirectLogin);

// STEP 2: Google redirects back here
router.get("/google/callback", googleRedirectCallback);

/* =========================
   AUTH STATUS
========================= */

// Used by frontend when page loads
router.get("/me", checkAuth);

/* =========================
   PROTECTED ROUTES
========================= */

// Example protected route
router.get("/protected", authMiddleware, (req: Request, res: Response) => {
  res.status(200).json({
    message: "You are authenticated",
    user: (req as any).user,
  });
});

/* =========================
   LOGOUT
========================= */

router.post("/logout", logout);

export default router;