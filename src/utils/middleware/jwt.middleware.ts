// @deno-types="npm:@types/express@5"
import { NextFunction, Request, Response } from "npm:express";
import { HttpException } from "../http-exception.ts";
import { verifyJwtToken } from "../../infra/jwt.ts";
import prisma from "../../infra/prisma.ts";
import winston from "../../winston.ts";
import { idValidationSchema } from "../../handler/generic/generic.schema.ts";

export const jwtMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const logger = winston.child({ source: "jwtMiddleware" });
  const authorization = req.headers["authorization"];
  if (!authorization) {
    throw new HttpException(401, "invalid access token");
  }
  const jwtToken = authorization.replace("Bearer ", "");
  const decoded = verifyJwtToken(jwtToken);
  if (typeof decoded === "string") {
    throw new HttpException(401, "invalid access token");
  }

  const { success, data } = idValidationSchema.safeParse({ id: decoded.sub });
  if (!success) {
    throw new HttpException(401, "invalid access token");
  }

  const accountId = data.id;
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) {
    logger.warn("account not found");
    throw new HttpException(401, "invalid access token");
  }

  req["accountId"] = accountId;
  next();
};
