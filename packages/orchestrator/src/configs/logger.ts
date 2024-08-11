import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
const { combine, timestamp, printf } = winston.format;

const myFormat = printf(({ level, message, timestamp, meta }) => {
  return `${timestamp} [${level}] ${message} ${
    meta ? JSON.stringify(meta) : ""
  }`;
});

const transport = new DailyRotateFile({
  filename: "logs/application-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "14d",
});

const logger = winston.createLogger({
  level: "info",
  format: combine(timestamp(), myFormat),
  transports: [transport],
});

export default logger;
