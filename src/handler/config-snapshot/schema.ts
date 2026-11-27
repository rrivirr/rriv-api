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
    id: z.string().uuid().optional(),
  })
  .merge(getPaginationSchema(["createdAt", "name"], "createdAt"))
  .strict();

export const activeConfigQuerySchema = z
  .object({
    deviceId: z.string().uuid(),
    contextId: z.string().uuid(),
  })
  .strict();

export const configHistoryQuerySchema = z
  .object({
    deviceIdentifier: z.string(),
    limit: z.coerce.number().int().min(1).max(100).optional().default(100),
    offset: z.coerce.number().int().min(0).optional().default(0),
    order: z.enum(["asc", "desc"]).optional().default("asc"),
    asAt: z.coerce.date().optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    sensorName: z.string().optional(),
  })
  .strict();

export const saveConfigSnapshotSchema = z
  .object({
    name: getNameSchema(),
    deviceId: z.string().uuid(),
    contextId: z.string().uuid(),
  })
  .strict();

export const configSnapshotLibraryConfigQuerySchema = z
  .object({
    search: getNameSchema().optional(),
    name: getNameSchema().optional(),
    isPublic: booleanQuerySchema,
    isOfficial: booleanQuerySchema,
    author: getNameSchema().optional(),
  })
  .merge(getPaginationSchema(["createdAt", "name"], "createdAt"))
  .strict();

export const updateLibraryConfigSchema = z
  .object({
    isPublic: z.boolean().optional(),
    name: getNameSchema().optional(),
    description: getNameSchema().nullable().optional(),
  })
  .strict()
  .refine(
    (body) => Object.values(body).some((value) => value !== undefined),
    "nothing to update",
  );

export const createConfigSnapshotLibraryConfigSchema = z
  .object({
    name: getNameSchema(),
    description: getNameSchema().optional(),
    datalogger: z.object({}).passthrough(),
    /** The datalogger's driver; its schema checks `datalogger`. */
    dataloggerDriverId: z.string().uuid(),
    /** Each sensor: its id on the board, its driver, and its settings. */
    sensors: z
      .object({ name: z.string(), sensorDriverId: z.string().uuid() })
      .passthrough()
      .array(),
    firmwareVersion: z
      .string()
      .regex(/^[\x21-\x7e]{1,32}$/)
      .optional(),
  })
  .strict();

export const createNewConfigSnapshotLibraryConfigVersionSchema = z
  .object({
    description: getNameSchema().optional(),
    datalogger: z.object({}).passthrough(),
    /** The datalogger's driver; its schema checks `datalogger`. */
    dataloggerDriverId: z.string().uuid(),
    /** Each sensor: its id on the board, its driver, and its settings. */
    sensors: z
      .object({ name: z.string(), sensorDriverId: z.string().uuid() })
      .passthrough()
      .array(),
    firmwareVersion: z
      .string()
      .regex(/^[\x21-\x7e]{1,32}$/)
      .optional(),
  })
  .strict();

export const renameSavedSnapshotSchema = z
  .object({ name: getNameSchema() })
  .strict();
