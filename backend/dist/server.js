"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const db_1 = require("./lib/db");
const logger_1 = require("./utils/logger");
const serverUrl = env_1.env.IS_CODESPACE
    ? `https://${process.env.CODESPACE_NAME}-${env_1.env.PORT}.app.github.dev`
    : `http://localhost:${env_1.env.PORT}`;
const startServer = async () => {
    try {
        await (0, db_1.connectDB)();
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