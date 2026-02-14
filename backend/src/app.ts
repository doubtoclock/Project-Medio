import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import meetpointRoutes from "./routes/meetpoint.routes";
import authRoutes from "./routes/auth.routes";
import placeRoutes from "./routes/place.routes";
import searchRoutes from "./routes/search.routes";

const app = express();

/* =========================
   APP CONFIG
========================= */

// 🔒 Needed for secure cookies behind proxies (Render, Railway, etc.)
app.set("trust proxy", 1);

/* =========================
   MIDDLEWARES
========================= */
app.use(
  cors({
    origin: "http://localhost:5173", // frontend URL
    credentials: true,               // 🔥 allow cookies
  })
);

app.use(express.json());
app.use(cookieParser()); // 🔥 parse JWT from cookies

/* =========================
   HEALTH CHECK
========================= */
app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({ message: "Server is running 🚀" });
});

/* =========================
   ROUTES
========================= */

// 🔐 Auth routes (login, google oauth, me, logout)
app.use("/api/auth", authRoutes);

// 📍 Meetpoint routes (protected internally)
app.use("/api/meetpoint", meetpointRoutes);

// 📍 Place routes
app.use("/api/places", placeRoutes);

// 🔍 Search routes
app.use("/api/search", searchRoutes);

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
