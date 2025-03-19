// @deno-types="npm:@types/express@5"
import { Request, Response } from "npm:express";
import {
  createNewSensorLibraryConfigVersionValidationSchema,
  createSensorConfigValidationSchema,
  createSensorDriverValidationSchema,
  createSensorLibraryConfigValidationSchema,
  sensorDriverQueryValidationSchema,
  sensorLibraryConfigQueryValidationSchema,
} from "./schema.ts";
import * as sensorService from "../../service/sensor.service.ts";
import { idValidationSchema } from "../generic/generic.schema.ts";
import { HttpException } from "../../utils/http-exception.ts";

export const createSensorDriver = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  const requestBody = createSensorDriverValidationSchema.parse(req.body);

  const sensorDriver = await sensorService.createSensorDriver({
    ...requestBody,
    accountId,
  });
  res.status(201).json(sensorDriver);
};

export const getSensorDriver = async (req: Request, res: Response) => {
  const query = sensorDriverQueryValidationSchema.parse(req.query);

  const sensorDrivers = await sensorService.getSensorDriver(query);
  res.status(200).json(sensorDrivers);
};

export const createSensorConfig = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  const requestBody = createSensorConfigValidationSchema.parse(req.body);

  const sensorConfig = await sensorService.createSensorConfig({
    ...requestBody,
    accountId,
  });
  res.status(201).json(sensorConfig);
};

export const deleteSensorDriver = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  const params = idValidationSchema.parse(req.params);

  const sensorDriver = await sensorService.deleteSensorDriver({
    ...params,
    accountId,
  });
  res.status(200).json(sensorDriver);
};

export const deleteSensorConfig = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  const params = idValidationSchema.parse(req.params);

  const sensorConfig = await sensorService.deleteSensorConfig({
    ...params,
    accountId,
  });
  res.status(200).json(sensorConfig);
};

export const createSensorLibraryConfig = async (
  req: Request,
  res: Response,
) => {
  const accountId = req.accountId;
  const requestBody = createSensorLibraryConfigValidationSchema.parse(req.body);

  const sensorLibraryConfig = await sensorService.createSensorLibraryConfig({
    ...requestBody,
    accountId,
  });
  res.status(201).json(sensorLibraryConfig);
};

export const getSensorLibraryConfig = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  const query = sensorLibraryConfigQueryValidationSchema.parse(req.query);
  const sensorLibraryConfigs = await sensorService.getSensorLibraryConfig(
    { ...query, accountId },
  );
  res.status(200).json(sensorLibraryConfigs);
};

export const getSensorLibraryConfigById = async (
  req: Request,
  res: Response,
) => {
  const params = idValidationSchema.parse(req.params);
  const sensorLibraryConfig = await sensorService.getSensorLibraryConfigById(
    params,
  );

  if (!sensorLibraryConfig) {
    throw new HttpException(404, "sensor library config not found");
  }

  res.status(200).json({ ...sensorLibraryConfig, creatorId: undefined });
};

export const createNewSensorLibraryConfigVersion = async (
  req: Request,
  res: Response,
) => {
  const accountId = req.accountId;
  const requestBody = createNewSensorLibraryConfigVersionValidationSchema.parse(
    req.body,
  );
  const params = idValidationSchema.parse(req.params);

  await sensorService.createNewSensorLibraryConfigVersion({
    ...requestBody,
    ...params,
    accountId,
  });
  res.status(201).json();
};

export const deleteSensorLibraryConfig = async (
  req: Request,
  res: Response,
) => {
  const accountId = req.accountId;
  const params = idValidationSchema.parse(req.params);

  const sensorLibraryConfig = await sensorService.deleteSensorLibraryConfig({
    ...params,
    accountId,
  });

  res.status(200).json(sensorLibraryConfig);
};
