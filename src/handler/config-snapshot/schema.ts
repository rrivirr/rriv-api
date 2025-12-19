import { z } from "zod";
import {
  booleanQuerySchema,
  getNameSchema,
  getPaginationSchema,
} from "../generic/generic.schema.ts";

export const configSnapshotQuerySchema = z
  .object({
    search: getNameSchema().optional(),
    name: getNameSchema().optional(),
  })
  .merge(
    getPaginationSchema(["createdAt", "name"], "createdAt"),
  ).strict();

export const activeConfigQuerySchema = z
  .object({
    deviceId: z.string().uuid(),
    contextId: z.string().uuid(),
  }).strict();

export const configHistoryQuerySchema = z
  .object({
    deviceId: z.string().uuid(),
    limit: z.coerce.number().int().min(1).max(100).optional().default(100),
    offset: z.number().int().min(0).max(100).optional().default(0),
    order: z.enum(["asc", "desc"]).optional().default("asc"),
    asAt: z.coerce.date().optional(),
    sensorName: z.string().optional(),
  }).strict();

export const saveConfigSnapshotSchema = z.object({
  name: getNameSchema(),
  deviceId: z.string().uuid(),
  contextId: z.string().uuid(),
}).strict();

export const overwriteActiveConfigSnapshotSchema = z.object({
  deviceId: z.string().uuid(),
  contextId: z.string().uuid(),
  dataloggerConfigId: z.string().uuid().optional(),
  sensorConfigIds: z.string().uuid().array(),
  createdAt: z.coerce.date(),
}).strict();

export const configSnapshotLibraryConfigQuerySchema = z.object({
  search: getNameSchema().optional(),
  name: getNameSchema().optional(),
  isPublic: booleanQuerySchema,
}).merge(
  getPaginationSchema(["createdAt", "name"], "createdAt"),
).strict();

const baseLibraryConfigSchema = z.object({
  name: getNameSchema(),
  description: getNameSchema().optional(),
});

export const createConfigSnapshotLibraryConfigSchema = baseLibraryConfigSchema
  .extend(
    { deviceId: z.string().uuid(), contextId: z.string().uuid() },
  ).or(
    baseLibraryConfigSchema.extend({ configSnapshotId: z.string().uuid() }),
  );

const baseLibraryConfigVersionSchema = z.object({
  description: getNameSchema().optional(),
});

export const createNewConfigSnapshotLibraryConfigVersionSchema =
  baseLibraryConfigVersionSchema
    .extend(
      { deviceId: z.string().uuid(), contextId: z.string().uuid() },
    ).or(
      baseLibraryConfigVersionSchema.extend({
        configSnapshotId: z.string().uuid(),
      }),
    );
