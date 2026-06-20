import mongoose from "mongoose";
import { env } from "../config/env";
import { logger } from "../utils/logger";

export const connectDB = async () => {
  mongoose.set("bufferCommands", false);
  mongoose.set("sanitizeFilter", true);
  mongoose.set("strictQuery", true);

  try {
    const connection = await mongoose.connect(env.MONGO_URI, {
      autoIndex: !env.IS_PRODUCTION,
      serverSelectionTimeoutMS: 10000,
    });

    logger.info("MongoDB connected", {
      host: connection.connection.host,
      database: connection.connection.name,
    });

    return connection;
  } catch (error) {
    logger.error("MongoDB connection failed", { error });
    throw error;
  }
};

export const isMongoReady = () => mongoose.connection.readyState === 1;
