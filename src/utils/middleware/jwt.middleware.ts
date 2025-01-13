// @deno-types="npm:@types/express@5"
import { NextFunction, Request, Response } from "npm:express";
import { HttpException } from "../http-exception.ts";
import { verifyJwtToken } from "../../infra/jwt.ts";

export const jwtMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const authorization = req.headers["authorization"];
  if (!authorization) {
    throw new HttpException(401, "invalid access token");
  }
  const jwtToken = authorization.replace("Bearer ", "");
  const decoded = verifyJwtToken(jwtToken);
  if (typeof decoded === "string") {
    throw new HttpException(401, "invalid access token");
  }
  req["accountId"] = decoded.sub!;
  next();
};
