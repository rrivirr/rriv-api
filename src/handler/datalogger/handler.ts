// @deno-types="npm:@types/express@5"
import { Request, Response } from "npm:express";
import {
  createDataloggerConfigValidationSchema,
  createDataloggerDriverValidationSchema,
  createDataloggerLibraryConfigValidationSchema,
  createNewDataloggerLibraryConfigVersionValidationSchema,
  dataloggerDriverQueryValidationSchema,
  dataloggerLibraryConfigQueryValidationSchema,
} from "./schema.ts";
import * as dataloggerService from "../../service/datalogger.service.ts";
import { idValidationSchema } from "../generic/generic.schema.ts";
import { HttpException } from "../../utils/http-exception.ts";

export const createDataloggerDriver = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  const requestBody = createDataloggerDriverValidationSchema.parse(req.body);

  const dataloggerDriver = await dataloggerService.createDataloggerDriver({
    ...requestBody,
    accountId,
  });
  res.status(201).json(dataloggerDriver);
};

export const getDataloggerDriver = async (req: Request, res: Response) => {
  const query = dataloggerDriverQueryValidationSchema.parse(req.query);

  const dataloggerDrivers = await dataloggerService.getDataloggerDriver(query);
  res.status(200).json(dataloggerDrivers);
};

export const createDataloggerConfig = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  const requestBody = createDataloggerConfigValidationSchema.parse(req.body);

  const dataloggerConfig = await dataloggerService.createDataloggerConfig({
    ...requestBody,
    accountId,
  });
  res.status(201).json(dataloggerConfig);
};

export const deleteDataloggerDriver = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  const params = idValidationSchema.parse(req.params);

  const dataloggerDriver = await dataloggerService.deleteDataloggerDriver({
    ...params,
    accountId,
  });
  res.status(200).json(dataloggerDriver);
};

export const deleteDataloggerConfig = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  const params = idValidationSchema.parse(req.params);

  const dataloggerConfig = await dataloggerService.deleteDataloggerConfig({
    ...params,
    accountId,
  });
  res.status(200).json(dataloggerConfig);
};

export const createDataloggerLibraryConfig = async (
  req: Request,
  res: Response,
) => {
  const accountId = req.accountId;
  const requestBody = createDataloggerLibraryConfigValidationSchema.parse(
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
  const query = dataloggerLibraryConfigQueryValidationSchema.parse(req.query);
  const dataloggerLibraryConfigs = await dataloggerService
    .getDataloggerLibraryConfig(
      { ...query, accountId },
    );
  res.status(200).json(dataloggerLibraryConfigs);
};

export const getDataloggerLibraryConfigById = async (
  req: Request,
  res: Response,
) => {
  const params = idValidationSchema.parse(req.params);
  const dataloggerLibraryConfig = await dataloggerService
    .getDataloggerLibraryConfigById(
      params,
    );

  if (!dataloggerLibraryConfig) {
    throw new HttpException(404, "datalogger library config not found");
  }

  res.status(200).json({ ...dataloggerLibraryConfig, creatorId: undefined });
};

export const createNewDataloggerLibraryConfigVersion = async (
  req: Request,
  res: Response,
) => {
  const accountId = req.accountId;
  const requestBody = createNewDataloggerLibraryConfigVersionValidationSchema
    .parse(
      req.body,
    );
  const params = idValidationSchema.parse(req.params);

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
  const params = idValidationSchema.parse(req.params);

  const dataloggerLibraryConfig = await dataloggerService
    .deleteDataloggerLibraryConfig(
      {
        ...params,
        accountId,
      },
    );

  res.status(200).json(dataloggerLibraryConfig);
};
