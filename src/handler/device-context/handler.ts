// @deno-types="npm:@types/express@5"
import { Request, Response } from "npm:express";
import {
  createDeviceContextValidationSchema,
  deviceContextParamsValidationSchema,
  updateDeviceContextValidationSchema,
} from "./schema.ts";
import * as deviceContextService from "../../service/device-context.service.ts";

export const createDeviceContext = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  const params = deviceContextParamsValidationSchema.parse(req.params);
  const requestBody = createDeviceContextValidationSchema.parse(req.body);
  await deviceContextService.createDeviceContext({
    accountId,
    ...params,
    ...requestBody,
  });
  res.status(201).json();
};

export const updateDeviceContext = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  const params = deviceContextParamsValidationSchema.parse(req.params);
  const requestBody = updateDeviceContextValidationSchema.parse(req.body);
  await deviceContextService.updateDeviceContext({
    accountId,
    ...params,
    ...requestBody,
  });
  res.status(200).json();
};

export const deleteDeviceContext = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  const params = deviceContextParamsValidationSchema.parse(req.params);
  await deviceContextService.deleteDeviceContext({ accountId, ...params });
  res.status(200).json();
};
