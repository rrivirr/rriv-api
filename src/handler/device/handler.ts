// @deno-types="npm:@types/express@5"
import { Request, Response } from "npm:express";
import {
  createFirmwareEntrySchema,
  deviceQuerySchema,
  firmwareHistoryQuerySchema,
  provisionDeviceSchema,
  serialNumberSchema,
} from "./schema.ts";
import * as deviceService from "../../service/device.service.ts";

export const bindDevice = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  const params = serialNumberSchema.parse(req.params);
  const device = await deviceService.bindDevice({
    ...params,
    accountId,
  });
  res.json(device);
};

export const provisionDevice = async (
  req: Request,
  res: Response,
) => {
  const accountId = req.accountId;
  const requestBody = provisionDeviceSchema.parse(req.body);
  const { device, status } = await deviceService.provisionDevice({
    accountId,
    ...requestBody,
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

export const createFirmwareEntry = async (
  req: Request,
  res: Response,
) => {
  const accountId = req.accountId;
  const requestBody = createFirmwareEntrySchema.parse(req.body);

  await deviceService.createFirmwareEntry({ ...requestBody, accountId });
  res.json();
};

export const getFirmwareHistory = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  const query = firmwareHistoryQuerySchema.parse(req.query);

  const deviceFirmwareHistory = await deviceService.getFirmwareHistory({
    ...query,
    accountId,
  });
  res.json(deviceFirmwareHistory);
};
