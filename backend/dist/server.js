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
                query: "{ routers { routerId } }",
            }),
            signal: controller.signal,
        });
        clearTimeout(timeout);
        if (res.ok) {
            logger_1.logger.info("OTP service warmup successful");
        }
        else {
            logger_1.logger.warn("OTP service warmup returned non-ok", {
                status: res.status,
            });
        }
    }
    catch (err) {
        logger_1.logger.warn("OTP service warmup failed (service may still be starting)", {
            message: err.message,
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