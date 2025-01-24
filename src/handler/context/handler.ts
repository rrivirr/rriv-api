// @deno-types="npm:@types/express@5"
import { Request, Response } from "npm:express";
import {
  contextGetQueryValidationSchema,
  contextPatchValidationSchema,
  contextPostValidationSchema,
} from "./schema.ts";
import { idValidationSchema } from "../generic/generic.schema.ts";
import * as contextService from "../../service/context.service.ts";

export const createContext = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  const requestBody = contextPostValidationSchema.parse(req.body);
  const createdContext = await contextService.createContext({
    ...requestBody,
    accountId,
  });
  res.status(201).json(createdContext);
};

export const getContext = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  const query = contextGetQueryValidationSchema.parse(req.query);

  const contexts = await contextService.getContext({ ...query, accountId });
  res.status(200).json(contexts);
};

export const updateContext = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  const requestBody = contextPatchValidationSchema.parse(req.body);
  const params = idValidationSchema.parse(req.params);
  const createdContext = await contextService.updateContext({
    ...requestBody,
    ...params,
    accountId,
  });
  res.status(200).json(createdContext);
};

export const deleteContext = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  const params = idValidationSchema.parse(req.params);
  const deletedContext = await contextService.deleteContext({
    accountId,
    contextId: params.id,
  });
  res.status(200).json(deletedContext);
};
