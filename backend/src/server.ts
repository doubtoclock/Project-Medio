import "dotenv/config";

import app from "./app";
import { connectDB } from "./lib/db";
import cors from "cors";
import routeRoutes from "./routes/route.routes";
import meetRoutes from "./routes/meet.routes";   // 👈 ADD THIS

const PORT = Number(process.env.PORT) || 5001;

const startServer = async () => {
  try {
    // Connect to MongoDB first
    await connectDB();

    // Enable CORS
    app.use(
      cors({
        origin: "http://localhost:5173",
        credentials: true,
      })
    );

    // Register API routes
    app.use("/api", routeRoutes);
    app.use("/api", meetRoutes);   // 👈 ADD THIS

    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error("❌ Failed to start server", error);
    process.exit(1);
  }
};

startServer();
