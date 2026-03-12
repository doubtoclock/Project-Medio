import "dotenv/config";

import app from "./app";
import { connectDB } from "./lib/db";

/* =========================
   ENV CONFIG
========================= */

const PORT = Number(process.env.PORT) || 5001;

const isCodespace = Boolean(process.env.CODESPACE_NAME);

const SERVER_URL = isCodespace
  ? `https://${process.env.CODESPACE_NAME}-${PORT}.app.github.dev`
  : `http://localhost:${PORT}`;

/* =========================
   START SERVER
========================= */

const startServer = async () => {
  try {
    // Connect MongoDB
    await connectDB();
    console.log("✅ MongoDB connected");

    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on ${SERVER_URL}`);
    });

  } catch (error) {
    console.error("❌ Failed to start server");
    console.error(error);
    process.exit(1);
  }
};

startServer();