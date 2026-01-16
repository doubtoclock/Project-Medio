import "dotenv/config"; // ✅ MUST be first

import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import placeRoutes from "./routes/place.routes"; // ✅ ADD THIS
import { connectDB } from "./lib/db";

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use("/auth", authRoutes);
app.use("/places", placeRoutes); // ✅ ADD THIS

// Health check route
app.get("/", (_req, res) => {
  res.json({ message: "Server is running 🚀" });
});

// Global error handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(err.stack);
    res.status(500).json({ message: "Something went wrong" });
  }
);

const PORT = process.env.PORT || 5000;

// 🚀 START SERVER ONLY AFTER DB CONNECTS
const startServer = async () => {
  try {
    await connectDB(); // ✅ WAIT for MongoDB connection
    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server", error);
    process.exit(1);
  }
};

startServer();
