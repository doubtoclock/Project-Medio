import crypto from "crypto";
import { CookieOptions, Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import { env } from "../config/env";
import { History } from "../models/history";
import { Place } from "../models/place";
import { User } from "../models/user";
import { registerUser, loginUser } from "../services/auth.service";
import { getOrCreateCurrentUser } from "../utils/current-user";
import { logger } from "../utils/logger";
import { signToken, verifyToken } from "../utils/jwt";
import {
  loginSchema,
  registerSchema,
  updateProfileSchema,
} from "../validators/auth.validator";

const AUTH_COOKIE_NAME = "token";
const OAUTH_STATE_COOKIE_NAME = "oauth_state";
const OAUTH_REDIRECT_COOKIE_NAME = "oauth_redirect";
const AUTH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000;

const googleClient = new OAuth2Client(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET
);

const cookieOptions = (maxAge?: number): CookieOptions => ({
  httpOnly: true,
  sameSite: env.IS_PRODUCTION ? "none" : "lax",
  secure: env.IS_PRODUCTION,
  path: "/",
  ...(maxAge ? { maxAge } : {}),
});

const getFallbackName = (email: string) => email.split("@")[0] || "Medio User";

const getAllowedFrontendOrigin = (url: string) => {
  try {
    const parsed = new URL(url);
    return env.ALLOWED_ORIGINS.includes(parsed.origin) ? parsed : null;
  } catch {
    return null;
  }
};

const getSafeRedirectUrl = (success: boolean, customBase?: string, token?: string) => {
  const fallbackBase = `${env.FRONTEND_URL}/login`;
  const customUrl = customBase ? getAllowedFrontendOrigin(customBase) : null;
  const redirectUrl = customUrl ?? new URL(fallbackBase);

  redirectUrl.searchParams.set("login", success ? "success" : "failed");
  if (token) {
    redirectUrl.searchParams.set("token", token);
  } else {
    redirectUrl.searchParams.delete("token");
  }

  return redirectUrl.toString();
};

const upsertGoogleUser = async (payload: {
  email: string;
  name?: string;
  picture?: string;
}) => {
  const email = payload.email.toLowerCase();
  const name = payload.name?.trim() || getFallbackName(email);
  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      email,
      name,
      authProvider: "google",
      avatarUrl: payload.picture,
      role: "user",
    });
    return user;
  }

  let shouldSave = false;

  if (payload.name?.trim() && user.name !== payload.name.trim()) {
    user.name = payload.name.trim();
    shouldSave = true;
  }

  if (payload.picture && user.avatarUrl !== payload.picture) {
    user.avatarUrl = payload.picture;
    shouldSave = true;
  }

  if (shouldSave) {
    await user.save();
  }

  return user;
};

const buildProfilePayload = async (userId: string) => {
  const [user, savedPlaces, recentActivity, tripsCount, activityCount] =
    await Promise.all([
      User.findById(userId),
      Place.find({ userId }).sort({ createdAt: -1 }),
      History.find({ userId }).sort({ createdAt: -1 }).limit(12),
      History.countDocuments({
        userId,
        action: { $in: ["ROUTE_PLANNED", "MEET_SEARCHED"] },
      }),
      History.countDocuments({ userId }),
    ]);

  if (!user) {
    return null;
  }

  const recentTrips = recentActivity.filter((item) =>
    ["ROUTE_PLANNED", "MEET_SEARCHED"].includes(item.action)
  );

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl || null,
      notificationsEnabled: user.notificationsEnabled,
      privacyMode: user.privacyMode,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    stats: {
      tripsCount,
      savedPlacesCount: savedPlaces.length,
      activityCount,
    },
    savedPlaces,
    recentTrips,
    recentActivity,
  };
};

export const register = async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const user = await registerUser(parsed.data);

    return res.status(201).json({
      message: "User registered successfully",
      data: user,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "User already exists") {
      return res.status(409).json({
        message: "User already exists",
      });
    }

    logger.error("Registration failed", { error });
    return res.status(500).json({
      message: "Registration failed",
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const token = await loginUser(parsed.data);

    res.cookie(
      AUTH_COOKIE_NAME,
      token,
      cookieOptions(AUTH_COOKIE_MAX_AGE_MS)
    );

    return res.status(200).json({
      message: "Login successful",
    });
  } catch {
    return res.status(401).json({
      message: "Invalid credentials",
    });
  }
};

export const googleRedirectLogin = (req: Request, res: Response) => {
  try {
    const state = crypto.randomBytes(32).toString("base64url");
    const redirect = typeof req.query.redirect === "string" ? req.query.redirect : "";
    const safeRedirect = redirect ? getAllowedFrontendOrigin(redirect) : null;

    res.cookie(
      OAUTH_STATE_COOKIE_NAME,
      state,
      cookieOptions(OAUTH_STATE_MAX_AGE_MS)
    );

    if (safeRedirect) {
      res.cookie(
        OAUTH_REDIRECT_COOKIE_NAME,
        safeRedirect.toString(),
        cookieOptions(OAUTH_STATE_MAX_AGE_MS)
      );
    } else if (redirect) {
      logger.warn("Ignored unsafe OAuth redirect", { redirect });
    }

    const url = googleClient.generateAuthUrl({
      access_type: "online",
      scope: ["profile", "email"],
      prompt: "select_account",
      redirect_uri: env.GOOGLE_CALLBACK_URL,
      state,
    });

    res.redirect(url);
  } catch (error) {
    logger.error("Google redirect failed", { error });
    res.status(500).json({ message: "Failed to start Google login" });
  }
};

export const googleRedirectCallback = async (
  req: Request,
  res: Response
) => {
  const customRedirect =
    typeof req.cookies?.[OAUTH_REDIRECT_COOKIE_NAME] === "string"
      ? req.cookies[OAUTH_REDIRECT_COOKIE_NAME]
      : "";

  try {
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = typeof req.query.state === "string" ? req.query.state : "";
    const expectedState =
      typeof req.cookies?.[OAUTH_STATE_COOKIE_NAME] === "string"
        ? req.cookies[OAUTH_STATE_COOKIE_NAME]
        : "";

    res.clearCookie(OAUTH_STATE_COOKIE_NAME, cookieOptions());
    res.clearCookie(OAUTH_REDIRECT_COOKIE_NAME, cookieOptions());

    if (!code || !state || !expectedState || state !== expectedState) {
      return res.redirect(getSafeRedirectUrl(false, customRedirect || undefined));
    }

    const { tokens } = await googleClient.getToken({
      code,
      redirect_uri: env.GOOGLE_CALLBACK_URL,
    });

    if (!tokens.id_token) {
      return res.redirect(getSafeRedirectUrl(false, customRedirect || undefined));
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload?.email) {
      return res.redirect(getSafeRedirectUrl(false, customRedirect || undefined));
    }

    const user = await upsertGoogleUser({
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    });

    const appToken = signToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
      picture: user.avatarUrl,
    });

    res.cookie(
      AUTH_COOKIE_NAME,
      appToken,
      cookieOptions(AUTH_COOKIE_MAX_AGE_MS)
    );

    res.redirect(getSafeRedirectUrl(true, customRedirect || undefined, appToken));
  } catch (error) {
    logger.error("Google OAuth callback failed", { error });
    res.redirect(getSafeRedirectUrl(false, customRedirect || undefined));
  }
};

const extractToken = (req: Request): string | null => {
  const fromCookie = req.cookies?.[AUTH_COOKIE_NAME];
  if (fromCookie) return fromCookie;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return null;
};

export const googleNativeSignIn = async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;

    if (!idToken || typeof idToken !== "string") {
      return res.status(400).json({ message: "Missing idToken" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload?.email) {
      return res.status(400).json({ message: "Invalid token" });
    }

    const user = await upsertGoogleUser({
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    });

    const appToken = signToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
      picture: user.avatarUrl,
    });

    res.cookie(
      AUTH_COOKIE_NAME,
      appToken,
      cookieOptions(AUTH_COOKIE_MAX_AGE_MS)
    );

    return res.status(200).json({
      token: appToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error("Google native sign-in failed", { error });
    return res.status(401).json({ message: "Google sign-in failed" });
  }
};

export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const user = await getOrCreateCurrentUser(req);

    if (!user) {
      return res.status(401).json({
        message: "Not authenticated",
      });
    }

    await Promise.all([
      Place.deleteMany({ userId: user._id }),
      History.deleteMany({ userId: user._id }),
      User.deleteOne({ _id: user._id }),
    ]);

    res.clearCookie(AUTH_COOKIE_NAME, cookieOptions());
    res.clearCookie(OAUTH_STATE_COOKIE_NAME, cookieOptions());
    res.clearCookie(OAUTH_REDIRECT_COOKIE_NAME, cookieOptions());

    return res.status(200).json({
      message: "Account deleted successfully",
    });
  } catch (error) {
    logger.error("Failed to delete account", { error });
    return res.status(500).json({
      message: "Failed to delete account",
    });
  }
};

export const checkAuth = async (req: Request, res: Response) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(200).json({
        authenticated: false,
      });
    }

    const decoded = verifyToken(token);

    return res.status(200).json({
      authenticated: true,
      user: {
        id: decoded.userId,
        email: decoded.email,
        name: decoded.name || "",
        avatarUrl: decoded.picture || null,
        role: decoded.role,
      },
    });
  } catch {
    return res.status(200).json({
      authenticated: false,
    });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const user = await getOrCreateCurrentUser(req);

    if (!user) {
      return res.status(401).json({
        message: "Not authenticated",
      });
    }

    const payload = await buildProfilePayload(user._id.toString());

    return res.status(200).json(payload);
  } catch (error) {
    logger.error("Failed to load profile", { error });
    return res.status(500).json({
      message: "Failed to load profile",
    });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const user = await getOrCreateCurrentUser(req);

    if (!user) {
      return res.status(401).json({
        message: "Not authenticated",
      });
    }

    const parsed = updateProfileSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const { name, avatarUrl, notificationsEnabled, privacyMode } = parsed.data;

    const changes: string[] = [];

    if (typeof name === "string" && name.trim()) {
      const normalizedName = name.trim();
      if (normalizedName !== user.name) {
        user.name = normalizedName;
        changes.push("name");
      }
    }

    if (avatarUrl === null || typeof avatarUrl === "string") {
      const normalizedAvatar = avatarUrl?.trim() || undefined;
      if ((user.avatarUrl || undefined) !== normalizedAvatar) {
        user.avatarUrl = normalizedAvatar;
        changes.push("avatar");
      }
    }

    if (typeof notificationsEnabled === "boolean") {
      if (user.notificationsEnabled !== notificationsEnabled) {
        user.notificationsEnabled = notificationsEnabled;
        changes.push("notifications");
      }
    }

    if (typeof privacyMode === "boolean") {
      if (user.privacyMode !== privacyMode) {
        user.privacyMode = privacyMode;
        changes.push("privacy");
      }
    }

    await user.save();

    if (changes.length > 0) {
      await History.create({
        userId: user._id,
        action: "PROFILE_UPDATED",
        value: `Updated ${changes.join(", ")}`,
      });
    }

    const payload = await buildProfilePayload(user._id.toString());

    return res.status(200).json({
      message: "Profile updated successfully",
      ...payload,
    });
  } catch (error) {
    logger.error("Failed to update profile", { error });
    return res.status(500).json({
      message: "Failed to update profile",
    });
  }
};

export const logout = (_req: Request, res: Response) => {
  res.clearCookie(AUTH_COOKIE_NAME, cookieOptions());
  res.clearCookie(OAUTH_STATE_COOKIE_NAME, cookieOptions());
  res.clearCookie(OAUTH_REDIRECT_COOKIE_NAME, cookieOptions());

  return res.status(200).json({
    message: "Logged out successfully",
  });
};
