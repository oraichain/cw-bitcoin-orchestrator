import { createLogger, format, transports } from "winston";
import { DiscordTransport } from "winston-transport-discord";

export const logger = (label: string, loglevel?: string) => {
  const myTransports = [new transports.Console()];
  if (process.env.WEBHOOK_URL) {
    myTransports.push(
      new DiscordTransport({
        discord: {
          webhook: {
            url: process.env.WEBHOOK_URL,
          },
        },
        level: "error",
      }) as any
    );
  }
  return createLogger({
    level: loglevel || "info",
    format: format.combine(
      format.label({ label }),
      format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      format.printf((info) => {
        return `${info.timestamp} [${info.level.toUpperCase()}] [${
          info.label
        }]: ${info.message}`;
      })
    ),
    transports: myTransports,
  });
};
