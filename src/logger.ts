import { createLogger, format, transports } from "winston";
import { env } from "./env.js";

const winstonLogger = createLogger({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  format: format.combine(
    format.colorize(),
    format.timestamp({ format: env.NODE_ENV === "production" ? "YYYY-MM-DD | HH:mm:ss:SSS" : "HH:mm:ss:SSS" }),
    format.printf(({ level, message, timestamp, context, trace }) => {
      const ctx = context ? `\x1b[33m[${context}]\x1b[0m ` : "";
      const traceOutput = trace ? `\n${JSON.stringify(trace, null, 2)}` : "";
      return `${timestamp} ${level} ${ctx}${message}${traceOutput}`;
    })
  ),
  transports: [new transports.Console()]
});

export const logger = {
  info: (module: string, msg: string, context?: string) => winstonLogger.info(`[${module}] ${msg}`, { context }),
  error: (module: string, msg: string, trace?: unknown, context?: string) => winstonLogger.error(`[${module}] ${msg}`, { trace, context }),
  debug: (module: string, msg: string, context?: string) => {
    if (winstonLogger.isLevelEnabled("debug")) {
      winstonLogger.debug(`[${module}] ${msg}`, { context });
    }
  }
};