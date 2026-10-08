import app from "./app";
import { env } from "./config/env";
import { connectDB } from "./lib/db";
import { logger } from "./utils/logger";

const serverUrl = `http://localhost:${env.PORT}`;

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
        query: `query Warmup {
          plan(
            from: { lat: 19.0725, lon: 72.8799 }
            to: { lat: 19.0815, lon: 72.8877 }
            transportModes: [{ mode: WALK }]
            numItineraries: 1
          ) {
            itineraries { duration }
          }
        }`,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      logger.info("OTP service warmup successful");
    } else {
      logger.warn("OTP service warmup returned non-ok - routes will fail", {
        status: res.status,
        url: otpUrl,
      });
    }
  } catch (err: any) {
    logger.warn("OTP service is unreachable - all route requests will return 502", {
      message: err.message,
      url: env.OTP_GRAPHQL_URL,
      hint: `Set OTP_BASE_URL (or OTP_HOSTPORT) to an OpenTripPlanner instance reachable from this process. Currently defaulting to "${env.OTP_BASE_URL}". A localhost address only works when OTP runs on the same machine as this backend.`,
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
