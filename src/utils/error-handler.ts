// @deno-types="npm:@types/express@5"
import { NextFunction, Request, Response } from "npm:express";
// @deno-types="npm:@types/jsonwebtoken@9"
import {
  JsonWebTokenError,
  NotBeforeError,
  TokenExpiredError,
} from "npm:jsonwebtoken";
import { ZodError } from "zod";
import logger from "../winston.ts";
import { HttpException } from "./http-exception.ts";

export default (
  // deno-lint-ignore no-explicit-any
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const errorLogger = logger.child({ source: "errorHandler" });
  if (err instanceof HttpException) {
    res.status(err.code).send({
      code: err.code,
      message: err.message,
    });
  } else if (err instanceof ZodError) {
    res.status(422).send({
      code: 422,
      message: err.issues.map(
        ({ path, message }) => `field: ${path}, error: ${message}`,
      ),
    });
  } else if (
    err instanceof JsonWebTokenError ||
    err instanceof NotBeforeError ||
    err instanceof TokenExpiredError
  ) {
    errorLogger.warn(err.message);

    res.status(401).send({
      code: 401,
      message: "invalid access token",
    });
  } else {
    errorLogger.error(err);
    errorLogger.error(err?.stack);

    res.status(500).send({
      code: 500,
      message: `Internal Server Error`,
    });
  }
};
