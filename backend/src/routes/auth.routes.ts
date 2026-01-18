import { Router, Request, Response, NextFunction } from "express";
import {
  register,
  login,
  googleRedirectLogin,
  googleRedirectCallback
} from "../controller/auth.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

console.log("✅ auth.routes.ts loaded");

/**
 * Auth Routes
 * Base path: /api/auth
 */

/* =========================
   TEST ROUTE (TEMPORARY)
========================= */
router.get("/test", (req: Request, res: Response) => {
  res.send("AUTH ROUTES WORKING");
});

/* =========================
   EMAIL / PASSWORD AUTH
========================= */

// Register
router.post(
  "/register",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await register(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// Login
router.post(
  "/login",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await login(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/* =========================
   GOOGLE AUTH (REDIRECT)
========================= */

// Step 1: Redirect user to Google login page
router.get("/google/redirect", googleRedirectLogin);

// Step 2: Google redirects back here
router.get("/google/callback", googleRedirectCallback);

/* =========================
   PROTECTED ROUTES
========================= */

// 🔐 Protected route (JWT required)
router.get(
  "/me",
  authMiddleware,
  (req: Request, res: Response) => {
    res.json({
      message: "You are authenticated",
      user: (req as any).user
    });
  }
);

export default router;
