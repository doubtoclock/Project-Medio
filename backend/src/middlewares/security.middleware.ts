import { NextFunction, Request, Response } from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import type { CorsOptions } from "cors";
import { env } from "../config/env";
import { logger } from "../utils/logger";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const dangerousKeys = new Set(["__proto__", "constructor", "prototype"]);

const sanitizeValue = (value: unknown): unknown => {
  if (!value || typeof value !== "object") return value;

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => {
        const lowerKey = key.toLowerCase();
        return (
          !dangerousKeys.has(lowerKey) &&
          !key.startsWith("$") &&
          !key.includes(".")
        );
      })
      .map(([key, entry]) => [key, sanitizeValue(entry)])
  );
};

const replaceObjectContents = (
  target: Record<string, unknown>,
  source: unknown
) => {
  if (!source || typeof source !== "object" || Array.isArray(source)) return;

  for (const key of Object.keys(target)) {
    delete target[key];
  }

  Object.assign(target, source);
};

const getOriginFromReferer = (referer: string | undefined) => {
  if (!referer) return null;

  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
};

const isAllowedOrigin = (origin: string | null | undefined) =>
  Boolean(origin && env.ALLOWED_ORIGINS.includes(origin));

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin || isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    logger.warn("Blocked CORS origin", { origin });
    callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 600,
};

export const securityHeaders = helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  strictTransportSecurity: env.IS_PRODUCTION
    ? {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      }
    : false,
});

export const requestSanitizer = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  req.body = sanitizeValue(req.body);
  replaceObjectContents(
    req.query as Record<string, unknown>,
    sanitizeValue(req.query)
  );
  replaceObjectContents(
    req.params as Record<string, unknown>,
    sanitizeValue(req.params)
  );
  next();
};

export const requireHttps = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!env.IS_PRODUCTION || req.secure || req.headers["x-forwarded-proto"] === "https") {
    next();
    return;
  }

  res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
};

export const csrfOriginGuard = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const origin = req.headers.origin ?? getOriginFromReferer(req.headers.referer);

  if (isAllowedOrigin(origin)) {
    next();
    return;
  }

  if (!origin && !env.IS_PRODUCTION) {
    next();
    return;
  }

  logger.warn("Blocked unsafe request with invalid origin", {
    method: req.method,
    path: req.originalUrl,
    origin,
  });

  res.status(403).json({ message: "Request origin is not allowed" });
};

export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.IS_PRODUCTION ? 300 : 1200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later" },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.IS_PRODUCTION ? 20 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  message: { message: "Too many authentication attempts" },
});

export const searchRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: env.IS_PRODUCTION ? 60 : 180,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many search requests" },
});
