import { Router, Request, Response } from "express";
import {
  register,
  login,
  googleRedirectLogin,
  googleRedirectCallback,
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
   PROTECTED ROUTES
========================= */

// 🔐 Check logged-in user
router.get("/me", authMiddleware, (req: Request, res: Response) => {
  res.status(200).json({
    message: "You are authenticated",
    user: (req as any).user,
  });
});

// 🚪 Logout (clear cookie)
router.post("/logout", (_req: Request, res: Response) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // true in production
  });

  res.status(200).json({
    message: "Logged out successfully",
  });
});

export default router;
