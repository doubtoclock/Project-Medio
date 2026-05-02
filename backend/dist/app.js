"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const meet_routes_1 = __importDefault(require("./routes/meet.routes"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const place_routes_1 = __importDefault(require("./routes/place.routes"));
const search_routes_1 = __importDefault(require("./routes/search.routes"));
const route_routes_1 = __importDefault(require("./routes/route.routes"));
const app = (0, express_1.default)();
/* =========================
   APP CONFIG
========================= */
// Needed for secure cookies behind proxies (Codespaces / cloud)
app.set("trust proxy", 1);
/* =========================
   ENV DETECTION
========================= */
const isCodespace = Boolean(process.env.CODESPACE_NAME);
const FRONTEND_URL = isCodespace
    ? `https://${process.env.CODESPACE_NAME}-5173.app.github.dev`
    : "http://localhost:5173";
/* =========================
   MIDDLEWARES
========================= */
app.use((0, cors_1.default)({
    origin: FRONTEND_URL,
    credentials: true,
}));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
/* =========================
   HEALTH CHECK
========================= */
app.get("/", (_req, res) => {
    res.status(200).json({ message: "Server is running 🚀" });
});
/* =========================
   ROUTES
========================= */
// 🔐 Auth routes
app.use("/api/auth", auth_routes_1.default);
// 📍 Meetpoint routes
app.use("/api/meet", meet_routes_1.default);
// 📍 Place routes
app.use("/api/places", place_routes_1.default);
// 🔍 Search routes
app.use("/api/search", search_routes_1.default);
// OTP routes
app.use("/api/otp", route_routes_1.default);
/* =========================
   GLOBAL ERROR HANDLER
========================= */
app.use((err, _req, res, _next) => {
    console.error("❌ Error:", err.message);
    res.status(500).json({
        message: "Something went wrong",
    });
});
exports.default = app;
//# sourceMappingURL=app.js.map