import express, { Request, Response, NextFunction } from "express";
import cors from "cors";

import meetpointRoutes from "./routes/meetpoint.routes";
import authRoutes from "./routes/auth.routes";
import placeRoutes from "./routes/place.routes"; // if you have this

const app = express();

/* =========================
   MIDDLEWARES
========================= */
app.use(cors());
app.use(express.json());

/* =========================
   HEALTH CHECK
========================= */
app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Server is running 🚀" });
});

/* =========================
   ROUTES
========================= */

// Auth routes (email + Google OAuth)
app.use("/api/auth", authRoutes);

// Meetpoint routes
app.use("/api", meetpointRoutes);

// Place routes (if used)
app.use("/api/places", placeRoutes);

app.use("/api/meeting-point", meetpointRoutes)

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
    console.error(err.stack);
    res.status(500).json({
      message: "Something went wrong",
    });
  }
);

export default app;