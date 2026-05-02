"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
const connectDB = async () => {
    mongoose_1.default.set("bufferCommands", false);
    mongoose_1.default.set("sanitizeFilter", true);
    mongoose_1.default.set("strictQuery", true);
    try {
        const connection = await mongoose_1.default.connect(env_1.env.MONGO_URI, {
            autoIndex: !env_1.env.IS_PRODUCTION,
            serverSelectionTimeoutMS: 10000,
        });
        logger_1.logger.info("MongoDB connected", {
            host: connection.connection.host,
            database: connection.connection.name,
        });
        return connection;
    }
    catch (error) {
        logger_1.logger.error("MongoDB connection failed", { error });
        throw error;
    }
};
exports.connectDB = connectDB;
//# sourceMappingURL=db.js.map