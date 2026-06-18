import app from "./app";
import { env } from "./config/env";
import { connectDB } from "./lib/db";
import { logger } from "./utils/logger";

const serverUrl = env.IS_CODESPACE
  ? `https://${process.env.CODESPACE_NAME}-${env.PORT}.app.github.dev`
  : `http://localhost:${env.PORT}`;

const warmUpOTP = async () => {
  try {
    const otpUrl = env.OTP_GRAPHQL_URL;
    logger.info("Warming up OTP service", { url: otpUrl });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    const res = await fetch(otpUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "{ routers { routerId } }",
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      logger.info("OTP service warmup successful");
    } else {
      logger.warn("OTP service warmup returned non-ok", {
        status: res.status,
      });
    }
  } catch (err: any) {
    logger.warn("OTP service warmup failed (service may still be starting)", {
      message: err.message,
    });
  }
};

const startServer = async () => {
  try {
    await connectDB();

    // Warm up OTP service in background (don't block startup)
    warmUpOTP();

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
