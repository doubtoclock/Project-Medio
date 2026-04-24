import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { connectDB } from "./lib/db";

console.log("MONGO_URI:", process.env.MONGO_URI);

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
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running on ${SERVER_URL}`);
    });
  } catch (error) {
    console.error("Failed to start server");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
};

startServer();
