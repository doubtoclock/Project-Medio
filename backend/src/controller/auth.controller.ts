import { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { History } from "../models/history";
import { Place } from "../models/place";
import { User } from "../models/user";
import { registerUser, loginUser } from "../services/auth.service";
import { getOrCreateCurrentUser } from "../utils/current-user";
import { registerSchema } from "../validators/auth.validator";

const isCodespace = Boolean(process.env.CODESPACE_NAME);

const FRONTEND_URL = isCodespace
  ? `https://${process.env.CODESPACE_NAME}-5173.app.github.dev`
  : "http://localhost:5173";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID as string;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET as string;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL as string;
const JWT_SECRET = process.env.JWT_SECRET as string;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_CALLBACK_URL) {
  throw new Error("Google OAuth environment variables are missing");
}

const googleClient = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET
);

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
    return res.status(500).json({
      message: "Registration failed",
      error: (error as Error).message,
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const token = await loginUser({ email, password });

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: isCodespace ? "none" : "lax",
      secure: Boolean(isCodespace),
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "Login successful",
    });
  } catch {
    return res.status(401).json({
      message: "Invalid credentials",
    });
  }
};

export const googleRedirectLogin = (_req: Request, res: Response) => {
  try {
    const url = googleClient.generateAuthUrl({
      access_type: "offline",
      scope: ["profile", "email"],
      prompt: "select_account",
      redirect_uri: GOOGLE_CALLBACK_URL,
    });

    res.redirect(url);
  } catch (error) {
    console.error("Google redirect error:", error);
    res.status(500).json({ message: "Failed to start Google login" });
  }
};

export const googleRedirectCallback = async (
  req: Request,
  res: Response
) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.redirect(FRONTEND_URL);
    }

    const { tokens } = await googleClient.getToken({
      code: code as string,
      redirect_uri: GOOGLE_CALLBACK_URL,
    });

    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token as string,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload?.email) {
      return res.redirect(FRONTEND_URL);
    }

    const appToken = jwt.sign(
      {
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", appToken, {
      httpOnly: true,
      sameSite: isCodespace ? "none" : "lax",
      secure: Boolean(isCodespace),
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.redirect(FRONTEND_URL);
  } catch (error) {
    console.error("Google OAuth Error:", error);
    res.redirect(FRONTEND_URL);
  }
};

export const checkAuth = async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(200).json({
        authenticated: false,
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      email: string;
      name?: string;
      picture?: string;
    };

    return res.status(200).json({
      authenticated: true,
      user: {
        email: decoded.email,
        name: decoded.name || "",
        avatarUrl: decoded.picture || null,
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
    console.error("Failed to load profile:", error);
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

    const {
      name,
      avatarUrl,
      notificationsEnabled,
      privacyMode,
    }: {
      name?: string;
      avatarUrl?: string | null;
      notificationsEnabled?: boolean;
      privacyMode?: boolean;
    } = req.body;

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
    console.error("Failed to update profile:", error);
    return res.status(500).json({
      message: "Failed to update profile",
    });
  }
};

export const logout = (_req: Request, res: Response) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: isCodespace ? "none" : "lax",
    secure: Boolean(isCodespace),
  });

  return res.status(200).json({
    message: "Logged out successfully",
  });
};
