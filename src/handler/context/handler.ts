// @deno-types="npm:@types/express@5"
import { Request, Response } from "npm:express";
import {
  contextQuerySchema,
  createContextSchema,
  updateContextSchema,
} from "./schema.ts";
import { idSchema } from "../generic/generic.schema.ts";
import * as contextService from "../../service/context.service.ts";

export const createContext = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  const requestBody = createContextSchema.parse(req.body);
  const createdContext = await contextService.createContext({
    ...requestBody,
    accountId,
  });
  res.status(201).json(createdContext);
};

export const getContext = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  const query = contextQuerySchema.parse(req.query);

  const contexts = await contextService.getContext({ ...query, accountId });
  res.json(contexts);
};

export const updateContext = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  const requestBody = updateContextSchema.parse(req.body);
  const params = idSchema.parse(req.params);
  const createdContext = await contextService.updateContext({
    ...requestBody,
    ...params,
    accountId,
  });
  res.json(createdContext);
};

export const deleteContext = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  const params = idSchema.parse(req.params);
  const deletedContext = await contextService.deleteContext({
    accountId,
    contextId: params.id,
  });
  res.json(deletedContext);
};
