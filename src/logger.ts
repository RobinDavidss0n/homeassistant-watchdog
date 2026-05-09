import { createLogger, format, transports } from "winston";

const winstonLogger = createLogger({
	level: "debug",
	format: format.combine(format.timestamp(), format.json()),
	transports: [new transports.Console()]
});

export const logger = {
	info: (msg: string) => winstonLogger.info(msg),
	error: (msg: string, trace?: unknown) => winstonLogger.error(msg, { trace }),
	debug: (msgFn: () => string) => winstonLogger.debug(msgFn())
};