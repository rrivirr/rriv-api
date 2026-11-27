// @deno-types="npm:@types/express@5"
import { Request, Response } from "npm:express";
import {
  activeConfigQuerySchema,
  configHistoryQuerySchema,
  configSnapshotLibraryConfigQuerySchema,
  configSnapshotQuerySchema,
  createConfigSnapshotLibraryConfigSchema,
  createNewConfigSnapshotLibraryConfigVersionSchema,
  renameSavedSnapshotSchema,
  saveConfigSnapshotSchema,
  updateLibraryConfigSchema,
} from "./schema.ts";
import { idOrNameSchema, idSchema } from "../generic/generic.schema.ts";
import * as configSnapshotService from "../../service/config-snapshot.service.ts";

export const getConfigSnapshots = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  const query = configSnapshotQuerySchema.parse(req.query);

  // user-saved config snapshots only (repository scopes to kind = 'saved')
  const configSnapshots = await configSnapshotService.getConfigSnapshots({
    ...query,
    accountId,
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

export const saveConfigSnapshot = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  const body = saveConfigSnapshotSchema.parse(req.body);

  const saved = await configSnapshotService
    .saveConfigSnapshot({
      ...body,
      accountId,
    });

  res.status(201).json({ id: saved.id, name: saved.name });
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
  const accountId = req.accountId;
  const params = idSchema.parse(req.params);

  const configSnapshotLibraryConfig = await configSnapshotService
    .getConfigSnapshotLibraryConfigById(
      { ...params, accountId },
    );

  res.json({
    ...configSnapshotLibraryConfig,
    creatorId: undefined,
    /** The caller owns it: they can edit, publish versions and archive. */
    isMine: configSnapshotLibraryConfig.creatorId === accountId,
  });
};

export const updateLibraryConfig = async (
  req: Request,
  res: Response,
) => {
  const accountId = req.accountId;
  const params = idSchema.parse(req.params);
  const body = updateLibraryConfigSchema.parse(req.body);

  const updated = await configSnapshotService
    .updateLibraryConfig(
      { ...body, accountId, ...params },
    );

  res.json(updated);
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

export const deleteConfigSnapshotLibraryConfig = async (
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

  const sensorLibraryConfig = await configSnapshotService
    .deleteConfigSnapshotLibraryConfig({
      ...identifier,
      accountId,
    });

  res.json(sensorLibraryConfig);
};

export const renameSavedSnapshot = async (req: Request, res: Response) => {
  const params = idSchema.parse(req.params);
  const body = renameSavedSnapshotSchema.parse(req.body);
  res.json(
    await configSnapshotService.renameSavedSnapshot({
      ...params,
      ...body,
      accountId: req.accountId,
    }),
  );
};

export const deleteSavedSnapshot = async (req: Request, res: Response) => {
  const params = idSchema.parse(req.params);
  await configSnapshotService.deleteSavedSnapshot({
    ...params,
    accountId: req.accountId,
  });
  res.status(204).json();
};
