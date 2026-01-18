import { Request, Response } from "express";
import { registerUser, loginUser } from "../services/auth.service";
import { registerSchema } from "../validators/auth.validator";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";

/* =========================
   GOOGLE OAUTH CLIENT
========================= */
const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "http://localhost:5000/api/auth/google/callback"
);

/* =========================
   REGISTER CONTROLLER
========================= */
export const register = async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: parsed.error.flatten().fieldErrors
      });
    }

    const user = await registerUser(parsed.data);

    return res.status(201).json({
      message: "User registered successfully",
      data: user
    });
  } catch (error) {
    return res.status(500).json({
      message: "Registration failed",
      error: (error as Error).message
    });
  }
};

/* =========================
   LOGIN CONTROLLER
========================= */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    const token = await loginUser({ email, password });

    return res.status(200).json({
      message: "Login successful",
      token
    });
  } catch (error) {
    return res.status(401).json({
      message: "Invalid credentials",
      error: (error as Error).message
    });
  }
};

/* =========================
   GOOGLE LOGIN (REDIRECT)
========================= */

/**
 * STEP 1: Redirect user to Google login page
 */
export const googleRedirectLogin = (req: Request, res: Response) => {
  const url = googleClient.generateAuthUrl({
    access_type: "offline",
    scope: ["profile", "email"],
    prompt: "select_account" // 👈 force account chooser
  });

  res.redirect(url);
};

/**
 * STEP 2: Google redirects back here
 */
export const googleRedirectCallback = async (req: Request, res: Response) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.redirect("http://localhost:5173/login?error=google");
    }

    const { tokens } = await googleClient.getToken(code as string);

    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();

    if (!payload?.email) {
      return res.redirect("http://localhost:5173/login?error=google");
    }

    // Create app JWT
    const appToken = jwt.sign(
      {
        email: payload.email,
        name: payload.name,
        picture: payload.picture
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" }
    );

    // Redirect to frontend with token
    res.redirect(`http://localhost:5173/meet?token=${appToken}`);
  } catch (error) {
    console.error("Google OAuth Error:", error);
    res.redirect("http://localhost:5173/login?error=google");
  }
};
