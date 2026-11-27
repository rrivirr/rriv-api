import { z } from "zod";
import { Ajv } from "ajv";
import {
  booleanQuerySchema,
  getNameSchema,
  getPaginationSchema,
} from "../generic/generic.schema.ts";

export const createDataloggerDriverSchema = z.object({
  name: getNameSchema(),
  validation: z.record(z.unknown()).refine(
    (data) => {
      try {
        if (!Object.values(data).length) return false;

        const ajv = new Ajv({ addUsedSchema: false });
        ajv.compile(data);
        return true;
      } catch (_e) {
        return false;
      }
    },
    "invalid json schema received",
  ),
}).strict();

export const createDataloggerConfigSchema = z.object({
  name: getNameSchema(),
  config: z.object({}).passthrough(),
  dataloggerDriverId: z.string().uuid(),
  deviceId: z.string().uuid(),
  contextId: z.string().uuid(),
  singlePropertyChange: z.boolean(),
  createdAt: z.coerce.date(),
  /**
   * The library version applied to the device. Omitted for hand edits (the
   * previous row's source is kept); `null` when the config came from
   * somewhere else, such as a saved snapshot (the source is cleared).
   */
  source: z.object({
    kind: z.enum(["datalogger", "system"]),
    versionId: z.string().uuid(),
  }).strict().nullable().optional(),
}).strict();

export const dataloggerDriverQuerySchema = z
  .object({
    search: getNameSchema().optional(),
  })
  .merge(
    getPaginationSchema(["createdAt", "name"], "createdAt"),
  ).strict();

export const createDataloggerLibraryConfigSchema = z.object({
  name: getNameSchema(),
  description: getNameSchema().optional(),
  config: z.object({}).passthrough(),
  /** The driver this datalogger config is for; its schema checks `config`. */
  dataloggerDriverId: z.string().uuid(),
  /** The firmware version the config was saved with, e.g. "1.4.0". */
  firmwareVersion: z.string().regex(/^[\x21-\x7e]{1,32}$/).optional(),
}).strict();

export const dataloggerLibraryConfigQuerySchema = z.object({
  search: getNameSchema().optional(),
  name: getNameSchema().optional(),
  isPublic: booleanQuerySchema,
  isOfficial: booleanQuerySchema,
  author: getNameSchema().optional(),
}).merge(
  getPaginationSchema(["createdAt", "name"], "createdAt"),
).strict();

export const createNewDataloggerLibraryConfigVersionSchema = z.object(
  {
    config: z.object({}).passthrough(),
    /** The driver this datalogger config is for; its schema checks `config`. */
    dataloggerDriverId: z.string().uuid(),
    description: getNameSchema().optional(),
    /** The firmware version the config was saved with, e.g. "1.4.0". */
    firmwareVersion: z.string().regex(/^[\x21-\x7e]{1,32}$/).optional(),
  },
).strict();
