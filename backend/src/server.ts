import app from "./app";
import { env } from "./config/env";
import { connectDB } from "./lib/db";
import { logger } from "./utils/logger";

const serverUrl = env.IS_CODESPACE
  ? `https://${process.env.CODESPACE_NAME}-${env.PORT}.app.github.dev`
  : `http://localhost:${env.PORT}`;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(env.PORT, () => {
      logger.info("Server started", {
        url: serverUrl,
        environment: env.NODE_ENV,
      });
    });
  } catch (error) {
    logger.error("Failed to start server", { error });
    process.exit(1);
  }
};

void startServer();
