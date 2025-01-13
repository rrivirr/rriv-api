// @deno-types="npm:@types/express@5"
import { Request, Response } from "npm:express";
import {
  contextGetQueryValidationSchema,
  contextPatchValidationSchema,
  contextPostValidationSchema,
} from "./schema.ts";
import {
  createContext,
  getContext,
  updateContext,
} from "../../service/context.service.ts";
import { idValidationSchema } from "../generic/generic.schema.ts";

export const contextPost = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  const requestBody = contextPostValidationSchema.parse(req.body);
  const createdContext = await createContext({
    ...requestBody,
    accountId,
  });
  res.status(201).json(createdContext);
};

export const contextGet = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  const query = contextGetQueryValidationSchema.parse(req.query);

  const contexts = await getContext({ ...query, accountId });
  res.status(200).json(contexts);
};

export const contextPatch = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  const requestBody = contextPatchValidationSchema.parse(req.body);
  const params = idValidationSchema.parse(req.params);
  const createdContext = await updateContext({
    ...requestBody,
    ...params,
    accountId,
  });
  res.status(201).json(createdContext);
};
