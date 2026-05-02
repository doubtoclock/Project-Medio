import { Request } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { User } from "../models/user";

export const getOrCreateCurrentUser = async (req: Request) => {
  const decoded = (req as Partial<AuthenticatedRequest>).user;

  if (!decoded?.userId) {
    return null;
  }

  const user = await User.findById(decoded.userId);

  return user ?? null;
};
