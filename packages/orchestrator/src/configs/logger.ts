export const logger = (label: string, loglevel?: string): any => {
  return {
    info: (text: string, ...args) =>
      console.info(`${new Date().toLocaleString()} [INFO] [${label}]: ${text}`),
    error: (text: string, ...args) => {
      console.log(args);
      console.error(
        `${new Date().toLocaleString()} [ERROR] [${label}]: ${text}, ${args}`
      );
    },
  };
};
