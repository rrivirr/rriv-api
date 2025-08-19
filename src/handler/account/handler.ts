// @deno-types="npm:@types/express@5"
import { Request, Response } from "npm:express";
import { createAccountSchema, emailSchema } from "./schema.ts";
import * as accountService from "../../service/account.service.ts";

export const createAccount = async (req: Request, res: Response) => {
  const requestBody = createAccountSchema.parse(req.body);
  await accountService.createAccount({
    ...requestBody,
  });
  res.status(201).json();
};

export const verifyEmail = async (req: Request, res: Response) => {
  const requestBody = emailSchema.parse(
    req.body,
  );
  await accountService.verifyEmail(requestBody.email);
  res.status(204).json();
};

export const resetPassword = async (req: Request, res: Response) => {
  const requestBody = emailSchema.parse(
    req.body,
  );
  await accountService.resetPassword(requestBody.email);
  res.status(204).json();
};
