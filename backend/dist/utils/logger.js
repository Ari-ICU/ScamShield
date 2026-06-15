import winston from "winston";
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};
const colors = {
    error: "red",
    warn: "yellow",
    info: "green",
    http: "magenta",
    debug: "white",
};
winston.addColors(colors);
const isDev = process.env.NODE_ENV !== "production";
// Development: colorized human-readable output
const devFormat = winston.format.combine(winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }), winston.format.colorize({ all: true }), winston.format.printf((info) => `[${info.timestamp}] [${info.level}]: ${info.message}`));
// Production: structured JSON (compatible with Datadog, CloudWatch, etc.)
const prodFormat = winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: true }), winston.format.json());
const transports = [
    new winston.transports.Console({
        format: isDev ? devFormat : prodFormat,
    }),
    new winston.transports.File({
        filename: "logs/error.log",
        level: "error",
        format: prodFormat,
    }),
    new winston.transports.File({
        filename: "logs/combined.log",
        format: prodFormat,
    }),
];
const logger = winston.createLogger({
    level: isDev ? "debug" : "info",
    levels,
    transports,
});
export default logger;
