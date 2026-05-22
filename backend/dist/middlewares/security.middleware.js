"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchRateLimiter = exports.authRateLimiter = exports.generalRateLimiter = exports.csrfOriginGuard = exports.requireHttps = exports.requestSanitizer = exports.securityHeaders = exports.corsOptions = void 0;
const express_rate_limit_1 = require("express-rate-limit");
const helmet_1 = __importDefault(require("helmet"));
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const dangerousKeys = new Set(["__proto__", "constructor", "prototype"]);
const sanitizeValue = (value) => {
    if (!value || typeof value !== "object")
        return value;
    if (Array.isArray(value)) {
        return value.map(sanitizeValue);
    }
    return Object.fromEntries(Object.entries(value)
        .filter(([key]) => {
        const lowerKey = key.toLowerCase();
        return (!dangerousKeys.has(lowerKey) &&
            !key.startsWith("$") &&
            !key.includes("."));
    })
        .map(([key, entry]) => [key, sanitizeValue(entry)]));
};
const replaceObjectContents = (target, source) => {
    if (!source || typeof source !== "object" || Array.isArray(source))
        return;
    for (const key of Object.keys(target)) {
        delete target[key];
    }
    Object.assign(target, source);
};
const getOriginFromReferer = (referer) => {
    if (!referer)
        return null;
    try {
        return new URL(referer).origin;
    }
    catch {
        return null;
    }
};
const isAllowedOrigin = (origin) => Boolean(origin && env_1.env.ALLOWED_ORIGINS.includes(origin));
exports.corsOptions = {
    origin(origin, callback) {
        if (!origin || isAllowedOrigin(origin)) {
            callback(null, true);
            return;
        }
        logger_1.logger.warn("Blocked CORS origin", { origin });
        callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 600,
};
exports.securityHeaders = (0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    strictTransportSecurity: env_1.env.IS_PRODUCTION
        ? {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
        }
        : false,
});
const requestSanitizer = (req, _res, next) => {
    req.body = sanitizeValue(req.body);
    replaceObjectContents(req.query, sanitizeValue(req.query));
    replaceObjectContents(req.params, sanitizeValue(req.params));
    next();
};
exports.requestSanitizer = requestSanitizer;
const requireHttps = (req, res, next) => {
    if (!env_1.env.IS_PRODUCTION || req.secure || req.headers["x-forwarded-proto"] === "https") {
        next();
        return;
    }
    res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
};
exports.requireHttps = requireHttps;
const csrfOriginGuard = (req, res, next) => {
    if (SAFE_METHODS.has(req.method)) {
        next();
        return;
    }
    const origin = req.headers.origin ?? getOriginFromReferer(req.headers.referer);
    if (isAllowedOrigin(origin)) {
        next();
        return;
    }
    if (!origin && !env_1.env.IS_PRODUCTION) {
        next();
        return;
    }
    logger_1.logger.warn("Blocked unsafe request with invalid origin", {
        method: req.method,
        path: req.originalUrl,
        origin,
    });
    res.status(403).json({ message: "Request origin is not allowed" });
};
exports.csrfOriginGuard = csrfOriginGuard;
exports.generalRateLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 15 * 60 * 1000,
    limit: env_1.env.IS_PRODUCTION ? 300 : 1200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests, please try again later" },
});
exports.authRateLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 15 * 60 * 1000,
    limit: env_1.env.IS_PRODUCTION ? 20 : 100,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    message: { message: "Too many authentication attempts" },
});
exports.searchRateLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 60 * 1000,
    limit: env_1.env.IS_PRODUCTION ? 60 : 180,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many search requests" },
});
//# sourceMappingURL=security.middleware.js.map