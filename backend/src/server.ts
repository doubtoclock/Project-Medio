import "dotenv/config";

import app from "./app";
import { connectDB } from "./lib/db";
import cors from "cors";
import routeRoutes from "./routes/route.routes";

const PORT = Number(process.env.PORT) || 5001;

const startServer = async () => {
  try {
    // Connect to MongoDB first
    await connectDB();

    // Enable CORS (important for frontend connection)
    app.use(
      cors({
        origin: "http://localhost:3000", // frontend port
        credentials: true,
      })
    );

    // OTP Route Integration
    app.use("/api", routeRoutes);

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
