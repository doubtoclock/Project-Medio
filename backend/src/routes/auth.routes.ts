import { Request, Response, Router } from "express";
import {
  checkAuth,
  deleteAccount,
  getProfile,
  googleNativeSignIn,
  googleRedirectCallback,
  googleRedirectLogin,
  login,
  logout,
  register,
  updateProfile,
} from "../controller/auth.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { authRateLimiter } from "../middlewares/security.middleware";
import { validateBody } from "../middlewares/validation.middleware";
import {
  loginSchema,
  registerSchema,
  updateProfileSchema,
} from "../validators/auth.validator";

const router = Router();

router.post("/register", authRateLimiter, validateBody(registerSchema), register);
router.post("/login", authRateLimiter, validateBody(loginSchema), login);

router.get("/google", authRateLimiter, googleRedirectLogin);
router.get("/google/callback", authRateLimiter, googleRedirectCallback);
router.post("/google/native", googleNativeSignIn);

router.get("/me", checkAuth);
router.get("/profile", authMiddleware, getProfile);
router.patch(
  "/profile",
  authMiddleware,
  validateBody(updateProfileSchema),
  updateProfile
);
router.delete("/account", authMiddleware, deleteAccount);

router.get("/protected", authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;

  res.status(200).json({
    message: "You are authenticated",
    user: {
      id: user.userId,
      email: user.email,
      role: user.role,
    },
  });
});

router.post("/logout", logout);

export default router;
