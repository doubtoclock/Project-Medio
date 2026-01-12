import "dotenv/config"; // ✅ MUST be first

import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import { connectDB } from "./lib/db"; // ✅ MongoDB connection

// Connect to MongoDB
connectDB();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Config
const PORT = process.env.PORT || 5000;

// Routes
app.use("/auth", authRoutes);

// Health check route
app.get("/", (req, res) => {
  res.json({ message: "Server is running 🚀" });
});

// Global error handler (safe fallback)
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error(err.stack);
    res.status(500).json({
      message: "Something went wrong"
    });
  }
);

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
