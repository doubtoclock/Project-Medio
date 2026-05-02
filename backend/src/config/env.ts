import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const isCodespace = Boolean(process.env.CODESPACE_NAME);
const defaultFrontendUrl = isCodespace
  ? `https://${process.env.CODESPACE_NAME}-5173.app.github.dev`
  : "http://localhost:5173";

const csv = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const validateMongoUri = (value: string) => {
  try {
    const parsed = new URL(value);
    return (
      (parsed.protocol === "mongodb:" || parsed.protocol === "mongodb+srv:") &&
      Boolean(parsed.hostname) &&
      !/\s/.test(value)
    );
  } catch {
    return false;
  }
};

const weakJwtSecrets = new Set([
  "secret",
  "jwt_secret",
  "changeme",
  "change-me",
  "password",
]);

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1024).max(65535).default(5001),
  MONGO_URI: z
    .string()
    .trim()
    .min(1, "MONGO_URI is required")
    .refine(validateMongoUri, "MONGO_URI must be a valid MongoDB URI"),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters")
    .refine((value) => !weakJwtSecrets.has(value.toLowerCase()), {
      message: "JWT_SECRET is too weak",
    }),
  JWT_ISSUER: z.string().trim().min(1).default("medio-api"),
  JWT_AUDIENCE: z.string().trim().min(1).default("medio-web"),
  JWT_EXPIRES_IN: z.string().trim().min(1).default("7d"),
  GOOGLE_CLIENT_ID: z.string().trim().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z
    .string()
    .trim()
    .min(1, "GOOGLE_CLIENT_SECRET is required"),
  GOOGLE_CALLBACK_URL: z.string().trim().url(),
  FRONTEND_URL: z.string().trim().url().optional(),
  ALLOWED_ORIGINS: z.string().optional(),
  OTP_GRAPHQL_URL: z
    .string()
    .trim()
    .url()
    .default("http://localhost:8080/otp/routers/default/index/graphql"),
  OTP_ISOCHRONE_URL: z
    .string()
    .trim()
    .url()
    .default("http://localhost:8080/otp/routers/default/isochrone"),
  BCRYPT_ROUNDS: z.coerce.number().int().min(12).max(15).default(12),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const issues = parsedEnv.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");

  throw new Error(`Invalid environment configuration: ${issues}`);
}

const values = parsedEnv.data;
const frontendUrl = values.FRONTEND_URL ?? defaultFrontendUrl;
const allowedOrigins = Array.from(
  new Set([frontendUrl, ...csv(values.ALLOWED_ORIGINS)])
);

if (values.NODE_ENV === "production" && allowedOrigins.length === 0) {
  throw new Error("At least one allowed frontend origin is required");
}

export const env = {
  ...values,
  FRONTEND_URL: frontendUrl,
  ALLOWED_ORIGINS: allowedOrigins,
  IS_CODESPACE: isCodespace,
  IS_PRODUCTION: values.NODE_ENV === "production",
};
