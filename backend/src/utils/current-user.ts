import { Request } from "express";
import { User } from "../models/user";

type RequestUser = {
  email?: string;
  name?: string;
  picture?: string;
};

const getFallbackName = (email: string) => {
  const [localPart] = email.split("@");
  return localPart || "Medio User";
};

export const getOrCreateCurrentUser = async (req: Request) => {
  const decoded = (req as Request & { user?: RequestUser }).user;

  if (!decoded?.email) {
    return null;
  }

  let user = await User.findOne({ email: decoded.email });

  if (!user) {
    user = await User.create({
      email: decoded.email,
      name: decoded.name?.trim() || getFallbackName(decoded.email),
      password: "google-oauth",
      avatarUrl: decoded.picture,
    });

    return user;
  }

  let shouldSave = false;

  if (decoded.name?.trim() && user.name !== decoded.name.trim()) {
    user.name = decoded.name.trim();
    shouldSave = true;
  }

  if (decoded.picture && user.avatarUrl !== decoded.picture) {
    user.avatarUrl = decoded.picture;
    shouldSave = true;
  }

  if (shouldSave) {
    await user.save();
  }

  return user;
};
