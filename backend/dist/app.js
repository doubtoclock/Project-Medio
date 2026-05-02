"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const env_1 = require("./config/env");
const error_middleware_1 = require("./middlewares/error.middleware");
const security_middleware_1 = require("./middlewares/security.middleware");
const logger_1 = require("./utils/logger");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const meet_routes_1 = __importDefault(require("./routes/meet.routes"));
const place_routes_1 = __importDefault(require("./routes/place.routes"));
const route_routes_1 = __importDefault(require("./routes/route.routes"));
const search_routes_1 = __importDefault(require("./routes/search.routes"));
const app = (0, express_1.default)();
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(security_middleware_1.requireHttps);
app.use(security_middleware_1.securityHeaders);
app.use((0, cors_1.default)(security_middleware_1.corsOptions));
app.use(security_middleware_1.generalRateLimiter);
app.use(express_1.default.json({ limit: "32kb" }));
app.use((0, cookie_parser_1.default)());
app.use(security_middleware_1.requestSanitizer);
app.use(security_middleware_1.csrfOriginGuard);
app.get("/", (_req, res) => {
    res.status(200).json({ message: "Server is running" });
});
app.use("/api/auth", auth_routes_1.default);
app.use("/api/meet", meet_routes_1.default);
app.use("/api/places", place_routes_1.default);
app.use("/api/search", search_routes_1.default);
app.use("/api/otp", route_routes_1.default);
app.use((err, req, res, next) => {
    logger_1.logger.error("Unhandled request error", {
        error: err,
        method: req.method,
        path: req.originalUrl,
    });
    (0, error_middleware_1.errorHandler)(err, req, res, next);
});
logger_1.logger.info("Express app configured", {
    environment: env_1.env.NODE_ENV,
    allowedOrigins: env_1.env.ALLOWED_ORIGINS,
});
exports.default = app;
//# sourceMappingURL=app.js.map