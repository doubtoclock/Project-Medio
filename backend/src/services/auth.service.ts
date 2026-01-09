import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { RegisterInput } from "../validators/auth.validator";

const JWT_SECRET = process.env.JWT_SECRET as string;

/**
 * REGISTER USER
 */
export const registerUser = async (data: RegisterInput) => {
  const { name, email, password } = data;

  // 1. Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    throw new Error("User already exists");
  }

  // 2. Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // 3. Create user (IMPORTANT: never return password)
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true
    }
  });

  return user;
};

/**
 * LOGIN USER
 */
export const loginUser = async (data: {
  email: string;
  password: string;
}) => {
  const { email, password } = data;

  // 1. Find user
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    throw new Error("Invalid email or password");
  }

  // 2. Compare password
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new Error("Invalid email or password");
  }

  // 3. Generate JWT
  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email
    },
    JWT_SECRET,
    {
      expiresIn: "7d"
    }
  );

  return token;
};
