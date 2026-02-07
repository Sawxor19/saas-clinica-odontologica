type LogLevel = "info" | "warn" | "error";

export const logger = {
  log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
    const payload = meta ? JSON.stringify(meta) : "";
    console[level](`[${level.toUpperCase()}] ${message} ${payload}`.trim());
  },
  info(message: string, meta?: Record<string, unknown>) {
    logger.log("info", message, meta);
  },
  warn(message: string, meta?: Record<string, unknown>) {
    logger.log("warn", message, meta);
  },
  error(message: string, meta?: Record<string, unknown>) {
    logger.log("error", message, meta);
  },
};
