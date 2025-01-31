// @deno-types="npm:@types/express@5"
import { Request, Response } from "npm:express";
import {
  contextQueryValidationSchema,
  createContextValidationSchema,
  updateContextValidationSchema,
} from "./schema.ts";
import { idValidationSchema } from "../generic/generic.schema.ts";
import * as contextService from "../../service/context.service.ts";

export const createContext = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  const requestBody = createContextValidationSchema.parse(req.body);
  const createdContext = await contextService.createContext({
    ...requestBody,
    accountId,
  });
  res.status(201).json(createdContext);
};

export const getContext = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  const query = contextQueryValidationSchema.parse(req.query);

  const contexts = await contextService.getContext({ ...query, accountId });
  res.status(200).json(contexts);
};

export const updateContext = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  const requestBody = updateContextValidationSchema.parse(req.body);
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
