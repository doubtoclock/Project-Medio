import "dotenv/config";

import app from "./app";
import { connectDB } from "./lib/db";
import cookieParser from "cookie-parser";

const PORT = Number(process.env.PORT) || 5001;

const startServer = async () => {
  try {
    // Connect to MongoDB first
    await connectDB();

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