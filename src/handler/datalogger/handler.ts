// @deno-types="npm:@types/express@5"
import { Request, Response } from "npm:express";
import {
  createDataloggerConfigSchema,
  createDataloggerDriverSchema,
  createDataloggerLibraryConfigSchema,
  createNewDataloggerLibraryConfigVersionSchema,
  dataloggerDriverQuerySchema,
  dataloggerLibraryConfigQuerySchema,
} from "./schema.ts";
import * as dataloggerService from "../../service/datalogger.service.ts";
import { idOrNameSchema, idSchema } from "../generic/generic.schema.ts";
import {
  configHistoryQuerySchema,
  updateLibraryConfigSchema,
} from "../config-snapshot/schema.ts";

export const createDataloggerDriver = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  const requestBody = createDataloggerDriverSchema.parse(req.body);

  const dataloggerDriver = await dataloggerService.createDataloggerDriver({
    ...requestBody,
    accountId,
  });
  res.status(201).json(dataloggerDriver);
};

export const getDataloggerDriver = async (req: Request, res: Response) => {
  const query = dataloggerDriverQuerySchema.parse(req.query);

  const dataloggerDrivers = await dataloggerService.getDataloggerDriver(query);
  res.json(dataloggerDrivers);
};

export const createDataloggerConfig = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  const requestBody = createDataloggerConfigSchema.parse(req.body);

  const dataloggerConfig = await dataloggerService.createDataloggerConfig({
    ...requestBody,
    accountId,
  });
  res.status(201).json(dataloggerConfig);
};

export const deleteDataloggerDriver = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  const params = idSchema.parse(req.params);

  const dataloggerDriver = await dataloggerService.deleteDataloggerDriver({
    ...params,
    accountId,
  });
  res.json(dataloggerDriver);
};

export const deleteDataloggerConfig = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  const params = idSchema.parse(req.params);

  const dataloggerConfig = await dataloggerService.deleteDataloggerConfig({
    ...params,
    accountId,
  });
  res.json(dataloggerConfig);
};

export const createDataloggerLibraryConfig = async (
  req: Request,
  res: Response,
) => {
  const accountId = req.accountId;
  const requestBody = createDataloggerLibraryConfigSchema.parse(
    req.body,
  );

  const dataloggerLibraryConfig = await dataloggerService
    .createDataloggerLibraryConfig(
      {
        ...requestBody,
        accountId,
      },
    );
  res.status(201).json(dataloggerLibraryConfig);
};

export const getDataloggerLibraryConfig = async (
  req: Request,
  res: Response,
) => {
  const accountId = req.accountId;
  const query = dataloggerLibraryConfigQuerySchema.parse(req.query);
  const dataloggerLibraryConfigs = await dataloggerService
    .getDataloggerLibraryConfig(
      { ...query, accountId },
    );
  res.json(dataloggerLibraryConfigs);
};

export const getDataloggerLibraryConfigById = async (
  req: Request,
  res: Response,
) => {
  const accountId = req.accountId;
  const params = idSchema.parse(req.params);
  const dataloggerLibraryConfig = await dataloggerService
    .getDataloggerLibraryConfigById(
      { ...params, accountId },
    );

  res.json({ ...dataloggerLibraryConfig, creatorId: undefined });
};

export const createNewDataloggerLibraryConfigVersion = async (
  req: Request,
  res: Response,
) => {
  const accountId = req.accountId;
  const requestBody = createNewDataloggerLibraryConfigVersionSchema
    .parse(
      req.body,
    );
  const params = idSchema.parse(req.params);

  await dataloggerService.createNewDataloggerLibraryConfigVersion({
    ...requestBody,
    ...params,
    accountId,
  });
  res.status(201).json();
};

export const deleteDataloggerLibraryConfig = async (
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

  const dataloggerLibraryConfig = await dataloggerService
    .deleteDataloggerLibraryConfig(
      { ...identifier, accountId },
    );

  res.json(dataloggerLibraryConfig);
};

export const getDataloggerConfigHistory = async (
  req: Request,
  res: Response,
) => {
  const accountId = req.accountId;
  const query = configHistoryQuerySchema.parse(req.query);

  const configSnapshotHistory = await dataloggerService
    .getDataloggerConfigHistory({
      ...query,
      accountId,
    });

  res.json(configSnapshotHistory);
};

export const updateDataloggerLibraryConfig = async (
  req: Request,
  res: Response,
) => {
  const accountId = req.accountId;
  const params = idSchema.parse(req.params);
  const body = updateLibraryConfigSchema.parse(req.body);

  await dataloggerService
    .updateDataloggerLibraryConfig(
      { ...body, accountId, ...params },
    );

  res.json();
};
