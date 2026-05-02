import bcrypt from "bcrypt";
import { env } from "../config/env";
import { User } from "../models/user";
import { signToken } from "../utils/jwt";
import { LoginInput, RegisterInput } from "../validators/auth.validator";

/**
 * REGISTER USER
 */
export const registerUser = async (data: RegisterInput) => {
  const { name, email, password } = data;

  // 1. Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error("User already exists");
  }

  // 2. Hash password
  const hashedPassword = await bcrypt.hash(password, env.BCRYPT_ROUNDS);

  // 3. Create user
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    authProvider: "local",
    role: "user"
  });

  // 4. Return safe response (no password)
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt
  };
};

/**
 * LOGIN USER
 */
export const loginUser = async (data: LoginInput) => {
  const { email, password } = data;

  // 1. Find user
  const user = await User.findOne({ email }).select("+password");
  if (!user?.password) {
    throw new Error("Invalid email or password");
  }

  // 2. Compare password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new Error("Invalid email or password");
  }

  // 3. Generate JWT
  return signToken({
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
    name: user.name,
    picture: user.avatarUrl,
  });
};
