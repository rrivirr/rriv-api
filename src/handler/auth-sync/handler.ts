// @deno-types="npm:@types/express@5"
import { Request, Response } from "npm:express";
import { authResourceParamsSchema, listAuthSyncQuerySchema } from "./schema.ts";
import { assertAdmin } from "../../service/auth.service.ts";
import * as authSyncService from "../../service/authorization-sync.service.ts";
import * as systemMetricsService from "../../service/system-metrics.service.ts";

export const listAuthSync = async (req: Request, res: Response) => {
  await assertAdmin(req.accountId);
  const query = listAuthSyncQuerySchema.parse(req.query);
  res.json(await authSyncService.listAuthSyncs(query));
};

export const resyncResource = async (req: Request, res: Response) => {
  await assertAdmin(req.accountId);
  const params = authResourceParamsSchema.parse(req.params);
  await authSyncService.resync({
    type: params.resourceType,
    id: params.resourceId,
  });
  res.json({ message: "resync scheduled" });
};

export const resyncFailed = async (req: Request, res: Response) => {
  await assertAdmin(req.accountId);
  res.json(await authSyncService.resyncAllFailed());
};

export const getMetrics = async (req: Request, res: Response) => {
  await assertAdmin(req.accountId);
  res.json(await systemMetricsService.getSystemMetrics());
};
