import { Request, Response } from "express";
import { registerUser, loginUser } from "../services/auth.service";
import { registerSchema } from "../validators/auth.validator";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";

/* =========================
   ENV HELPERS
========================= */

const isCodespace = Boolean(process.env.CODESPACE_NAME);

const FRONTEND_URL = isCodespace
  ? `https://${process.env.CODESPACE_NAME}-5173.app.github.dev`
  : "http://localhost:5173";

/* =========================
   REQUIRED ENV VARIABLES
========================= */

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID as string;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET as string;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL as string;
const JWT_SECRET = process.env.JWT_SECRET as string;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_CALLBACK_URL) {
  throw new Error("Google OAuth environment variables are missing");
}

/* =========================
   GOOGLE OAUTH CLIENT
========================= */

const googleClient = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET
);

/* =========================
   REGISTER
========================= */

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

/* =========================
   LOGIN
========================= */

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

/* =========================
   GOOGLE LOGIN
========================= */

export const googleRedirectLogin = (_req: Request, res: Response) => {
  try {
    console.log("➡️ Google login route hit");
    console.log("Callback URL:", GOOGLE_CALLBACK_URL);

    const url = googleClient.generateAuthUrl({
      access_type: "offline",
      scope: ["profile", "email"],
      prompt: "select_account",
      redirect_uri: GOOGLE_CALLBACK_URL,
    });

    console.log("Redirecting to Google:", url);

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

    console.log("Google callback hit");

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

    console.log("User authenticated:", payload.email);

    res.redirect(FRONTEND_URL);
  } catch (error) {
    console.error("Google OAuth Error:", error);
    res.redirect(FRONTEND_URL);
  }
};

/* =========================
   CHECK AUTH (for frontend)
========================= */

export const checkAuth = (req: Request, res: Response) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(200).json({
        authenticated: false,
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    return res.status(200).json({
      authenticated: true,
      user: decoded,
    });
  } catch {
    return res.status(200).json({
      authenticated: false,
    });
  }
};

/* =========================
   LOGOUT
========================= */

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