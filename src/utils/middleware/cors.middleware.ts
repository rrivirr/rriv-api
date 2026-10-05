import { NextFunction, Request, Response } from "express";
import config from "../../infra/get-config.ts";

const ALLOWED_ORIGINS = config.APP_ENV === "production"
  ? "https://*.rriv.org"
  : "http://localhost:8080";

const allowedOriginPatterns = ALLOWED_ORIGINS.split(",").map((origin) =>
  origin.trim()
);

const matchesOrigin = (origin: string, pattern: string): boolean => {
  if (origin === pattern) return true;

  if (pattern.includes("*")) {
    const CHAR = "[a-z0-9](?:[a-z0-9-]*[a-z0-9])?";
    const escaped = pattern
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, `(?:${CHAR})(?:\\.${CHAR})?`);

    const regex = new RegExp(`^${escaped}$`, "i");
    return regex.test(origin);
  }

  return false;
};

const isOriginAllowed = (origin: string): boolean =>
  allowedOriginPatterns.some((pattern) => matchesOrigin(origin, pattern));

export const corsMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const rawOrigin = req.headers["origin"];
  const origin = typeof rawOrigin === "string" ? rawOrigin : undefined;

  if (!origin || !isOriginAllowed(origin)) {
    return next();
  }

  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PATCH,PUT,DELETE,OPTIONS",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Authorization,Content-Type,Accept",
  );
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
};
