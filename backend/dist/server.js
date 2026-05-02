"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app_1 = __importDefault(require("./app"));
const db_1 = require("./lib/db");
console.log("MONGO_URI:", process.env.MONGO_URI);
/* =========================
   ENV CONFIG
========================= */
const PORT = Number(process.env.PORT) || 5001;
const isCodespace = Boolean(process.env.CODESPACE_NAME);
const SERVER_URL = isCodespace
    ? `https://${process.env.CODESPACE_NAME}-${PORT}.app.github.dev`
    : `http://localhost:${PORT}`;
/* =========================
   START SERVER
========================= */
const startServer = async () => {
    try {
        await (0, db_1.connectDB)();
        app_1.default.listen(PORT, () => {
            console.log(`Server running on ${SERVER_URL}`);
        });
    }
    catch (error) {
        console.error("Failed to start server");
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
    }
};
startServer();
//# sourceMappingURL=server.js.map