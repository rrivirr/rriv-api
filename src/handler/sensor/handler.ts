// @deno-types="npm:@types/express@5"
import { Request, Response } from "npm:express";
import {
  createNewSensorLibraryConfigVersionSchema,
  createSensorConfigSchema,
  createSensorDriverSchema,
  createSensorLibraryConfigSchema,
  deactivateSensorConfigSchema,
  sensorDriverQuerySchema,
  sensorLibraryConfigQuerySchema,
} from "./schema.ts";
import * as sensorService from "../../service/sensor.service.ts";
import { idOrNameSchema, idSchema } from "../generic/generic.schema.ts";
import {
  configHistoryQuerySchema,
  updateLibraryConfigSchema,
} from "../config-snapshot/schema.ts";

export const createSensorDriver = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  const requestBody = createSensorDriverSchema.parse(req.body);

  const sensorDriver = await sensorService.createSensorDriver({
    ...requestBody,
    accountId,
  });
  res.status(201).json(sensorDriver);
};

export const getSensorDriver = async (req: Request, res: Response) => {
  const query = sensorDriverQuerySchema.parse(req.query);

  const sensorDrivers = await sensorService.getSensorDriver(query);
  res.json(sensorDrivers);
};

export const createSensorConfig = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  const requestBody = createSensorConfigSchema.parse(req.body);

  const sensorConfig = await sensorService.createSensorConfig({
    ...requestBody,
    accountId,
  });
  // An upload identical to the active row is accepted without a new row.
  if ("unchanged" in sensorConfig) {
    const { unchanged: _unchanged, ...existing } = sensorConfig;
    res.status(200).json(existing);
    return;
  }
  res.status(201).json(sensorConfig);
};

export const deactivateSensorConfig = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  const requestBody = deactivateSensorConfigSchema.parse(req.body);

  const sensorConfig = await sensorService.deactivateSensorConfig({
    ...requestBody,
    accountId,
  });
  res.json(sensorConfig);
};

export const deleteSensorDriver = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  const params = idSchema.parse(req.params);

  const sensorDriver = await sensorService.deleteSensorDriver({
    ...params,
    accountId,
  });
  res.json(sensorDriver);
};

export const deleteSensorConfig = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  const params = idSchema.parse(req.params);

  const sensorConfig = await sensorService.deleteSensorConfig({
    ...params,
    accountId,
  });
  res.json(sensorConfig);
};

export const createSensorLibraryConfig = async (
  req: Request,
  res: Response,
) => {
  const accountId = req.accountId;
  const requestBody = createSensorLibraryConfigSchema.parse(req.body);

  const sensorLibraryConfig = await sensorService.createSensorLibraryConfig({
    ...requestBody,
    accountId,
  });
  res.status(201).json(sensorLibraryConfig);
};

export const getSensorLibraryConfig = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  const query = sensorLibraryConfigQuerySchema.parse(req.query);
  const sensorLibraryConfigs = await sensorService.getSensorLibraryConfig(
    { ...query, accountId },
  );
  res.json(sensorLibraryConfigs);
};

export const getSensorLibraryConfigById = async (
  req: Request,
  res: Response,
) => {
  const accountId = req.accountId;
  const params = idSchema.parse(req.params);
  const sensorLibraryConfig = await sensorService.getSensorLibraryConfigById(
    { ...params, accountId },
  );

  res.json({
    ...sensorLibraryConfig,
    creatorId: undefined,
    /** The caller owns it: they can edit, publish versions and archive. */
    isMine: sensorLibraryConfig.creatorId === accountId,
  });
};

export const createNewSensorLibraryConfigVersion = async (
  req: Request,
  res: Response,
) => {
  const accountId = req.accountId;
  const requestBody = createNewSensorLibraryConfigVersionSchema.parse(
    req.body,
  );
  const params = idSchema.parse(req.params);

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
  const params = idOrNameSchema.parse(req.params);
  const { success } = idSchema.safeParse({ id: params.id });
  let identifier;
  if (success) {
    identifier = { id: params.id };
  } else {
    identifier = { name: params.id };
  }

  const sensorLibraryConfig = await sensorService.deleteSensorLibraryConfig({
    ...identifier,
    accountId,
  });

  res.json(sensorLibraryConfig);
};

export const getSensorConfigHistory = async (
  req: Request,
  res: Response,
) => {
  const accountId = req.accountId;
  const query = configHistoryQuerySchema.parse(req.query);

  const configSnapshotHistory = await sensorService
    .getSensorConfigHistory({
      ...query,
      accountId,
    });

  res.json(configSnapshotHistory);
};

export const updateSensorLibraryConfig = async (
  req: Request,
  res: Response,
) => {
  const accountId = req.accountId;
  const params = idSchema.parse(req.params);
  const body = updateLibraryConfigSchema.parse(req.body);

  const updated = await sensorService
    .updateSensorLibraryConfig(
      { ...body, accountId, ...params },
    );

  res.json(updated);
};
