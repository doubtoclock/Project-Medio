import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

export type UserRole = "user" | "admin";

export type AuthenticatedUser = {
  userId: string;
  email: string;
  role: UserRole;
  name?: string;
  picture?: string;
};

type TokenPayload = {
  email: string;
  role: UserRole;
  name?: string;
  picture?: string;
};

export const signToken = (user: AuthenticatedUser) => {
  const payload: TokenPayload = {
    email: user.email,
    role: user.role,
    name: user.name,
    picture: user.picture,
  };

  return jwt.sign(payload, env.JWT_SECRET, {
    algorithm: "HS256",
    audience: env.JWT_AUDIENCE,
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
    issuer: env.JWT_ISSUER,
    subject: user.userId,
  });
};

export const verifyToken = (token: string): AuthenticatedUser => {
  const decoded = jwt.verify(token, env.JWT_SECRET, {
    algorithms: ["HS256"],
    audience: env.JWT_AUDIENCE,
    issuer: env.JWT_ISSUER,
  }) as jwt.JwtPayload & TokenPayload;

  if (
    typeof decoded.sub !== "string" ||
    typeof decoded.email !== "string" ||
    (decoded.role !== "user" && decoded.role !== "admin")
  ) {
    throw new Error("Invalid token payload");
  }

  return {
    userId: decoded.sub,
    email: decoded.email,
    role: decoded.role,
    name: typeof decoded.name === "string" ? decoded.name : undefined,
    picture: typeof decoded.picture === "string" ? decoded.picture : undefined,
  };
};
