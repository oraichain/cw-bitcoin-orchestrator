export const logger = (label: string, loglevel?: string): any => {
  // const myTransports = [new transports.Console()];
  // if (process.env.WEBHOOK_URL) {
  //   myTransports.push(
  //     new DiscordTransport({
  //       discord: {
  //         webhook: {
  //           url: process.env.WEBHOOK_URL,
  //         },
  //       },
  //       level: "error",
  //     }) as any
  //   );
  // }
  return {
    info: (text: string) =>
      console.info(`${new Date()} [INFO] [${label}]: ${text}`),
    error: (text: string, ...args) =>
      console.error(`${new Date()} [ERROR] [${label}]: ${text}, ${args}`),
  };
  // return createLogger({
  //   level: loglevel || "info",
  //   format: format.combine(
  //     format.label({ label }),
  //     format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  //     format.printf((info) => {
  //       return `${info.timestamp} [${info.level.toUpperCase()}] [${
  //         info.label
  //       }]: ${info.message}`;
  //     })
  //   ),
  //   transports: myTransports,
  // });
};
