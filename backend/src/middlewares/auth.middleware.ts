import { Request, Response, NextFunction } from "express";
import { AuthenticatedUser, UserRole, verifyToken } from "../utils/jwt";

export type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Try cookie first, then Authorization header as fallback
    let token = req.cookies?.token;

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ") && authHeader.length > 7) {
        token = authHeader.slice(7);
      }
    }

    if (!token) {
      return res.status(401).json({
        message: "Not authenticated",
      });
    }

    const decoded = verifyToken(token);

    // Attach user info to request
    (req as AuthenticatedRequest).user = decoded;

    next();
  } catch {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};

export const requireRole =
  (...roles: UserRole[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    const user = (req as Partial<AuthenticatedRequest>).user;

    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    return next();
  };
