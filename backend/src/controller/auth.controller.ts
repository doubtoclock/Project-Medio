import { Request, Response } from "express";
import { registerUser, loginUser } from "../services/auth.service";
import { registerSchema } from "../validators/auth.validator";
import { z } from "zod";

/**
 * REGISTER CONTROLLER
 */
export const register = async (req: Request, res: Response) => {
  try {
    // 1. Validate request body using Zod
    const parsed = registerSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: parsed.error.flatten().fieldErrors
      });
    }

    // 2. Call service layer
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

/**
 * LOGIN CONTROLLER
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Basic guard (login schema can be added later)
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    // 2. Call service layer
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
