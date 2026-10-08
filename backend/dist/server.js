"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const db_1 = require("./lib/db");
const logger_1 = require("./utils/logger");
const serverUrl = `http://localhost:${env_1.env.PORT}`;
const warmUpOTP = async () => {
    try {
        const otpUrl = env_1.env.OTP_GRAPHQL_URL;
        logger_1.logger.info("Warming up OTP service", { url: otpUrl });
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
            logger_1.logger.info("OTP service warmup successful");
        }
        else {
            logger_1.logger.warn("OTP service warmup returned non-ok - routes will fail", {
                status: res.status,
                url: otpUrl,
            });
        }
    }
    catch (err) {
        logger_1.logger.warn("OTP service is unreachable - all route requests will return 502", {
            message: err.message,
            url: env_1.env.OTP_GRAPHQL_URL,
            hint: `Set OTP_BASE_URL (or OTP_HOSTPORT) to an OpenTripPlanner instance reachable from this process. Currently defaulting to "${env_1.env.OTP_BASE_URL}". A localhost address only works when OTP runs on the same machine as this backend.`,
        });
    }
};
const startServer = async () => {
    try {
        await (0, db_1.connectDB)();
        // Warm up OTP service in background (don't block startup)
        warmUpOTP();
        app_1.default.listen(env_1.env.PORT, () => {
            logger_1.logger.info("Server started", {
                url: serverUrl,
                environment: env_1.env.NODE_ENV,
            });
        });
    }
    catch (error) {
        logger_1.logger.error("Failed to start server", { error });
        process.exit(1);
    }
};
void startServer();
//# sourceMappingURL=server.js.map