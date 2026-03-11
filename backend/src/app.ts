import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import meetRoutes from "./routes/meet.routes";
import authRoutes from "./routes/auth.routes";
import placeRoutes from "./routes/place.routes";
import searchRoutes from "./routes/search.routes";
import routeRoutes from "./routes/route.routes";

const app = express();

/* =========================
   APP CONFIG
========================= */

// Needed for secure cookies behind proxies (Codespaces / cloud)
app.set("trust proxy", 1);

/* =========================
   ENV DETECTION
========================= */

const isCodespace = Boolean(process.env.CODESPACE_NAME);

const FRONTEND_URL = isCodespace
  ? `https://${process.env.CODESPACE_NAME}-5173.app.github.dev`
  : "http://localhost:5173";

/* =========================
   MIDDLEWARES
========================= */

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

/* =========================
   HEALTH CHECK
========================= */

app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({ message: "Server is running 🚀" });
});

/* =========================
   ROUTES
========================= */

// 🔐 Auth routes
app.use("/api/auth", authRoutes);

// 📍 Meetpoint routes
app.use("/api/meet", meetRoutes);

// 📍 Place routes
app.use("/api/places", placeRoutes);

// 🔍 Search routes
app.use("/api/search", searchRoutes);

// OTP routes
app.use("/api/otp", routeRoutes);

/* =========================
   GLOBAL ERROR HANDLER
========================= */

app.use(
  (
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    console.error("❌ Error:", err.message);
    res.status(500).json({
      message: "Something went wrong",
    });
  }
);

export default app;