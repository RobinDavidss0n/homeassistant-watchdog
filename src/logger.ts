import { createLogger, format, transports } from "winston";

const winstonLogger = createLogger({
  level: "debug",
  format: format.combine(
    format.colorize(),
    format.timestamp({ format: "hh:mm:ss:SSS" }),
    format.printf(({ level, message, timestamp, context, trace }) => {
      const ctx = context ? `\x1b[33m[${context}]\x1b[0m ` : "";
      const traceOutput = trace ? `\n${JSON.stringify(trace, null, 2)}` : "";
      return `${timestamp} ${level} ${ctx}${message}${traceOutput}`;
    })
  ),
  transports: [new transports.Console()]
});

export const logger = {
  info: (msg: string, context?: string) => winstonLogger.info(msg, { context }),
  error: (msg: string, trace?: unknown, context?: string) => winstonLogger.error(msg, { trace, context }),
  debug: (msgFn: () => string, context?: string) => {
    if (winstonLogger.isLevelEnabled("debug")) {
      winstonLogger.debug(msgFn(), { context });
    }
  }
};