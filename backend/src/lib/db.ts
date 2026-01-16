import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    // Disable mongoose buffering (IMPORTANT)
    mongoose.set("bufferCommands", false);

    const conn = await mongoose.connect(process.env.MONGO_URI as string);

    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("❌ MongoDB connection failed");
    console.error(error);
    process.exit(1);
  }
};
