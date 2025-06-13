// @deno-types="npm:@types/express@5"
import { Request, Response } from "npm:express";
import {
  deviceBindSchema,
  deviceQuerySchema,
  serialNumberSchema,
} from "./schema.ts";
import * as deviceService from "../../service/device.service.ts";

export const bindDevice = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  const requestBody = deviceBindSchema.parse(req.body);
  const params = serialNumberSchema.parse(req.params);
  const { device, status } = await deviceService.bindDevice({
    ...requestBody,
    ...params,
    accountId,
  });
  res.status(status).json(device);
};

export const unbindDevice = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  const params = serialNumberSchema.parse(req.params);

  const device = await deviceService.unbindDevice({ ...params, accountId });
  res.json(device);
};

export const getDevices = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  const query = deviceQuerySchema.parse(req.query);

  const devices = await deviceService.getDevices({ ...query, accountId });
  res.json(devices);
};

export const deleteDevice = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  const params = serialNumberSchema.parse(req.params);
  const device = await deviceService.deleteDevice({
    accountId,
    serialNumber: params.serialNumber,
  });
  res.json(device);
};
