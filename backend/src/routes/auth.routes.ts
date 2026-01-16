import { Router, Request, Response, NextFunction } from "express";
import { register, login } from "../controller/auth.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

/**
 * Auth Routes
 * Base path: /auth
 */

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
