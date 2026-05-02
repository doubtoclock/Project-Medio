"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongodb_1 = require("mongodb");
const mongoose_1 = __importDefault(require("mongoose"));
const REQUIRED_USERNAME = "Achal";
const REQUIRED_OPTIONS = {
    retryWrites: "true",
    w: "majority",
    authSource: "admin",
};
const getMongoUri = () => {
    const rawUri = process.env.MONGO_URI?.trim();
    if (!rawUri) {
        throw new Error("MONGO_URI is missing from the environment");
    }
    const sanitizedUri = rawUri.replace(/^['"]|['"]$/g, "");
    let mongoUrl;
    try {
        mongoUrl = new URL(sanitizedUri);
    }
    catch {
        throw new Error("MONGO_URI must use the format mongodb+srv://USERNAME:PASSWORD@cluster-url.mongodb.net/DB_NAME?retryWrites=true&w=majority&authSource=admin");
    }
    if (mongoUrl.protocol !== "mongodb+srv:") {
        throw new Error("MONGO_URI must start with mongodb+srv://");
    }
    if (mongoUrl.username !== REQUIRED_USERNAME) {
        throw new Error(`MONGO_URI username must be exactly "${REQUIRED_USERNAME}"`);
    }
    if (!mongoUrl.password) {
        throw new Error("MONGO_URI password is missing");
    }
    if (/\s/.test(mongoUrl.password)) {
        throw new Error("MONGO_URI password must not contain spaces");
    }
    Object.entries(REQUIRED_OPTIONS).forEach(([key, value]) => {
        mongoUrl.searchParams.set(key, value);
    });
    const normalizedUri = mongoUrl.toString();
    process.env.MONGO_URI = normalizedUri;
    return normalizedUri;
};
const testNativeDriverConnection = async (mongoUri) => {
    const client = new mongodb_1.MongoClient(mongoUri);
    try {
        await client.connect();
        await client.db().command({ ping: 1 });
        console.log("MongoDB native driver test connected");
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("MongoDB native driver test failed:", message);
    }
    finally {
        await client.close().catch(() => undefined);
    }
};
const connectDB = async () => {
    mongoose_1.default.set("bufferCommands", false);
    const mongoUri = getMongoUri();
    return mongoose_1.default
        .connect(mongoUri)
        .then((connection) => {
        console.log("MongoDB Connected");
        console.log(`MongoDB host: ${connection.connection.host}`);
        return connection;
    })
        .catch(async (error) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error("MongoDB Connection Error:", message);
        await testNativeDriverConnection(mongoUri);
        throw error;
    });
};
exports.connectDB = connectDB;
//# sourceMappingURL=db.js.map