import { z } from "zod";
import {
  getNameSchema,
  getPaginationSchema,
} from "../generic/generic.schema.ts";

export const configSnapshotQuerySchema = z
  .object({
    search: getNameSchema().optional(),
  })
  .merge(
    getPaginationSchema(["createdAt", "name"], "createdAt"),
  ).strict();

export const activeConfigQuerySchema = z
  .object({
    deviceId: z.string().uuid(),
    contextId: z.string().uuid(),
  }).strict();

export const configSnapshotHistoryQuerySchema = z
  .object({
    deviceId: z.string().uuid(),
    contextId: z.string().uuid(),
    limit: z.number().int().min(1).max(100).optional().default(100),
    offset: z.number().int().min(0).max(100).optional().default(0),
    order: z.enum(["asc", "desc"]).optional().default("asc"),
  }).strict();

export const saveConfigSnapshotSchema = z.object({
  name: getNameSchema(),
  deviceId: z.string().uuid(),
  contextId: z.string().uuid(),
}).strict();

export const configSnapshotLibraryConfigQuerySchema = z.object({
  search: getNameSchema().optional(),
  isPublic: z.boolean().optional().default(true),
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
