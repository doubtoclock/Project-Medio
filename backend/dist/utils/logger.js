"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const env_1 = require("../config/env");
const levelPriority = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
};
const secretKeyPattern = /(authorization|cookie|password|secret|token|mongo|uri|client_secret|api[_-]?key)/i;
const redactString = (value) => value
    .replace(/mongodb(\+srv)?:\/\/([^:@\s]+):([^@\s]+)@/gi, "mongodb$1://[redacted]:[redacted]@")
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, "$1[redacted]")
    .replace(/(token=)[^;\s]+/gi, "$1[redacted]");
const redact = (value, key = "", depth = 0) => {
    if (secretKeyPattern.test(key))
        return "[redacted]";
    if (typeof value === "string")
        return redactString(value);
    if (value instanceof Error) {
        return {
            name: value.name,
            message: redactString(value.message),
            stack: env_1.env.IS_PRODUCTION ? undefined : redactString(value.stack ?? ""),
        };
    }
    if (!value || typeof value !== "object" || depth > 4)
        return value;
    if (Array.isArray(value)) {
        return value.slice(0, 20).map((item) => redact(item, key, depth + 1));
    }
    return Object.fromEntries(Object.entries(value).map(([entryKey, entry]) => [
        entryKey,
        redact(entry, entryKey, depth + 1),
    ]));
};
const writeLog = (level, message, meta) => {
    if (levelPriority[level] < levelPriority[env_1.env.LOG_LEVEL])
        return;
    const payload = {
        level,
        message,
        ...(meta ? { meta: redact(meta) } : {}),
    };
    const serialized = JSON.stringify(payload);
    if (level === "error") {
        console.error(serialized);
        return;
    }
    if (level === "warn") {
        console.warn(serialized);
        return;
    }
    console.log(serialized);
};
exports.logger = {
    debug: (message, meta) => writeLog("debug", message, meta),
    info: (message, meta) => writeLog("info", message, meta),
    warn: (message, meta) => writeLog("warn", message, meta),
    error: (message, meta) => writeLog("error", message, meta),
};
//# sourceMappingURL=logger.js.map