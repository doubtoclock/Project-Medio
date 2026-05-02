import { env } from "../config/env";

type LogLevel = "debug" | "info" | "warn" | "error";
type LogMeta = Record<string, unknown>;

const levelPriority: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const secretKeyPattern =
  /(authorization|cookie|password|secret|token|mongo|uri|client_secret|api[_-]?key)/i;

const redactString = (value: string) =>
  value
    .replace(
      /mongodb(\+srv)?:\/\/([^:@\s]+):([^@\s]+)@/gi,
      "mongodb$1://[redacted]:[redacted]@"
    )
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, "$1[redacted]")
    .replace(/(token=)[^;\s]+/gi, "$1[redacted]");

const redact = (value: unknown, key = "", depth = 0): unknown => {
  if (secretKeyPattern.test(key)) return "[redacted]";
  if (typeof value === "string") return redactString(value);
  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactString(value.message),
      stack: env.IS_PRODUCTION ? undefined : redactString(value.stack ?? ""),
    };
  }
  if (!value || typeof value !== "object" || depth > 4) return value;
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => redact(item, key, depth + 1));
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([entryKey, entry]) => [
      entryKey,
      redact(entry, entryKey, depth + 1),
    ])
  );
};

const writeLog = (level: LogLevel, message: string, meta?: LogMeta) => {
  if (levelPriority[level] < levelPriority[env.LOG_LEVEL]) return;

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

export const logger = {
  debug: (message: string, meta?: LogMeta) => writeLog("debug", message, meta),
  info: (message: string, meta?: LogMeta) => writeLog("info", message, meta),
  warn: (message: string, meta?: LogMeta) => writeLog("warn", message, meta),
  error: (message: string, meta?: LogMeta) => writeLog("error", message, meta),
};
