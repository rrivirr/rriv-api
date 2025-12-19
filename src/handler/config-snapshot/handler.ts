// @deno-types="npm:@types/express@5"
import { Request, Response } from "npm:express";
import {
  activeConfigQuerySchema,
  configHistoryQuerySchema,
  configSnapshotLibraryConfigQuerySchema,
  configSnapshotQuerySchema,
  createConfigSnapshotLibraryConfigSchema,
  createNewConfigSnapshotLibraryConfigVersionSchema,
  overwriteActiveConfigSnapshotSchema,
  saveConfigSnapshotSchema,
} from "./schema.ts";
import { idSchema } from "../generic/generic.schema.ts";
import * as configSnapshotService from "../../service/config-snapshot.service.ts";
import { HttpException } from "../../utils/http-exception.ts";

export const getConfigSnapshots = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  const query = configSnapshotQuerySchema.parse(req.query);

  // saved/tagged config snapshots only
  const configSnapshots = await configSnapshotService.getConfigSnapshots({
    ...query,
    accountId,
    active: false,
  });

  res.json(configSnapshots);
};

export const getActiveConfig = async (
  req: Request,
  res: Response,
) => {
  const accountId = req.accountId;
  const query = activeConfigQuerySchema.parse(req.query);

  const activeConfig = await configSnapshotService
    .getActiveConfig({
      ...query,
      accountId,
    });

  res.json(activeConfig);
};

export const getConfigSnapshotHistory = async (
  req: Request,
  res: Response,
) => {
  const accountId = req.accountId;
  const query = configHistoryQuerySchema.parse(req.query);

  const configSnapshotHistory = await configSnapshotService
    .getConfigSnapshotHistory({
      ...query,
      accountId,
    });

  res.json(configSnapshotHistory);
};

export const overwriteActiveConfigSnapshot = async (
  req: Request,
  res: Response,
) => {
  const accountId = req.accountId;
  const body = overwriteActiveConfigSnapshotSchema.parse(req.body);

  await configSnapshotService.overwriteActiveConfigSnapshot({
    ...body,
    accountId,
  });

  res.status(201).json();
};

export const saveConfigSnapshot = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  const body = saveConfigSnapshotSchema.parse(req.body);

  await configSnapshotService
    .saveConfigSnapshot({
      ...body,
      accountId,
    });

  res.status(201).json();
};

export const getConfigSnapshotLibraryConfig = async (
  req: Request,
  res: Response,
) => {
  const accountId = req.accountId;
  const query = configSnapshotLibraryConfigQuerySchema.parse(req.query);

  const configSnapshotLibraryConfigs = await configSnapshotService
    .getConfigSnapshotLibraryConfig({
      ...query,
      accountId,
    });

  res.json(configSnapshotLibraryConfigs);
};

export const getConfigSnapshotLibraryConfigById = async (
  req: Request,
  res: Response,
) => {
  const params = idSchema.parse(req.params);

  const configSnapshotLibraryConfig = await configSnapshotService
    .getConfigSnapshotLibraryConfigById(
      params,
    );

  if (!configSnapshotLibraryConfig) {
    throw new HttpException(404, "config snapshot library config not found");
  }

  res.json({ ...configSnapshotLibraryConfig, creatorId: undefined });
};

export const createConfigSnapshotLibraryConfig = async (
  req: Request,
  res: Response,
) => {
  const accountId = req.accountId;
  const body = createConfigSnapshotLibraryConfigSchema.parse(req.body);

  const configSnapshotLibraryConfig = await configSnapshotService
    .createConfigSnapshotLibraryConfig({
      ...body,
      accountId,
    });

  res.status(201).json(configSnapshotLibraryConfig);
};

export const createNewConfigSnapshotLibraryConfigVersion = async (
  req: Request,
  res: Response,
) => {
  const accountId = req.accountId;
  const params = idSchema.parse(req.params);
  const body = createNewConfigSnapshotLibraryConfigVersionSchema.parse(
    req.body,
  );

  await configSnapshotService
    .createNewConfigSnapshotLibraryConfigVersion({
      ...params,
      ...body,
      accountId,
    });

  res.status(201).json();
};
