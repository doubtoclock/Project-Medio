import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { env } from "./config/env";
import { isMongoReady } from "./lib/db";
import { errorHandler } from "./middlewares/error.middleware";
import {
  corsOptions,
  csrfOriginGuard,
  generalRateLimiter,
  requestSanitizer,
  requireHttps,
  securityHeaders,
} from "./middlewares/security.middleware";
import { logger } from "./utils/logger";

import authRoutes from "./routes/auth.routes";
import meetRoutes from "./routes/meet.routes";
import placeRoutes from "./routes/place.routes";
import routeRoutes from "./routes/route.routes";
import searchRoutes from "./routes/search.routes";

const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(requireHttps);
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(generalRateLimiter);
app.use(express.json({ limit: "32kb" }));
app.use(cookieParser());
app.use(requestSanitizer);
app.use(csrfOriginGuard);

app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({ message: "Server is running" });
});

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
  });
});

app.get("/ready", (_req: Request, res: Response) => {
  if (!isMongoReady()) {
    return res.status(503).json({
      status: "not_ready",
      mongo: "disconnected",
    });
  }

  return res.status(200).json({
    status: "ready",
    mongo: "connected",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/meet", meetRoutes);
app.use("/api/places", placeRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/otp", routeRoutes);

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error("Unhandled request error", {
    error: err,
    method: req.method,
    path: req.originalUrl,
  });
  errorHandler(err, req, res, next);
});

logger.info("Express app configured", {
  environment: env.NODE_ENV,
  allowedOrigins: env.ALLOWED_ORIGINS,
});

export default app;
