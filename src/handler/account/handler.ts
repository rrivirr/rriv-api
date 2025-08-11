// @deno-types="npm:@types/express@5"
import { Request, Response } from "npm:express";
import { createAccountSchema } from "./schema.ts";
import * as accountService from "../../service/account.service.ts";

export const createAccount = async (req: Request, res: Response) => {
  const requestBody = createAccountSchema.parse(req.body);
  await accountService.createAccount({
    ...requestBody,
  });
  res.status(201).json();
};
