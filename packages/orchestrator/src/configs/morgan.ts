import { Request, Response } from "express";
import morgan from "morgan";
import logger from "./logger";

morgan.token(
  "message",
  (req: Request, res: Response) =>
    `${res.locals.errorMessage || ""} - Body: ${JSON.stringify(
      req?.body || {}
    )} - Param: ${JSON.stringify(req?.params || {})} - Query: ${JSON.stringify(
      req?.query || {}
    )}`
);

const getIpFormat = () => "address -";
const successResponseFormat = `${getIpFormat()}:method :url :status - :response-time ms`;
const errorResponseFormat = `${getIpFormat()}:method :url :status - :response-time ms - message: :message`;

const successHandler = morgan(successResponseFormat, {
  skip: (req, res) => res.statusCode >= 400,
  stream: { write: (message) => logger.info(message.trim()) },
});

const errorHandler = morgan(errorResponseFormat, {
  skip: (req, res) => res.statusCode < 400,
  stream: { write: (message) => logger.error(message.trim()) },
});

export default {
  successHandler,
  errorHandler,
};
