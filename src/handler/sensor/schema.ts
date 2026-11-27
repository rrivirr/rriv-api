import { z } from "zod";
import { Ajv } from "ajv";
import {
  booleanQuerySchema,
  getNameSchema,
  getPaginationSchema,
} from "../generic/generic.schema.ts";

export const createSensorDriverSchema = z
  .object({
    name: getNameSchema(),
    validation: z.record(z.unknown()).refine((data) => {
      try {
        if (!Object.values(data).length) return false;

        const ajv = new Ajv({ addUsedSchema: false });
        ajv.compile(data);
        return true;
      } catch (_e) {
        return false;
      }
    }, "invalid json schema received"),
  })
  .strict();

export const createSensorConfigSchema = z
  .object({
    name: getNameSchema(1, 12),
    config: z.object({}).passthrough(),
    sensorDriverId: z.string().uuid(),
    deviceId: z.string().uuid(),
    contextId: z.string().uuid(),
    singlePropertyChange: z.boolean(),
    createdAt: z.coerce.date(),
    /**
     * The library version applied to the device. Omitted for hand edits (the
     * previous row's source is kept); `null` when the config came from
     * somewhere else, such as a saved snapshot (the source is cleared).
     */
    source: z
      .object({
        kind: z.enum(["sensor", "system"]),
        versionId: z.string().uuid(),
      })
      .strict()
      .nullable()
      .optional(),
  })
  .strict();

export const deactivateSensorConfigSchema = z
  .object({
    name: getNameSchema(1, 12),
    deviceId: z.string().uuid(),
    contextId: z.string().uuid(),
    deactivatedAt: z.coerce.date().optional(),
  })
  .strict();

export const sensorDriverQuerySchema = z
  .object({
    search: getNameSchema().optional(),
  })
  .merge(getPaginationSchema(["createdAt", "name"], "createdAt"))
  .strict();

export const createSensorLibraryConfigSchema = z
  .object({
    name: getNameSchema(),
    description: getNameSchema().optional(),
    config: z.object({}).passthrough(),
    sensorName: getNameSchema(1, 12),
    /** The driver this sensor config is for; its schema checks `config`. */
    sensorDriverId: z.string().uuid(),
    firmwareVersion: z
      .string()
      .regex(/^[\x21-\x7e]{1,32}$/)
      .optional(),
  })
  .strict();

export const sensorLibraryConfigQuerySchema = z
  .object({
    search: getNameSchema().optional(),
    name: getNameSchema().optional(),
    isPublic: booleanQuerySchema,
    isOfficial: booleanQuerySchema,
    author: getNameSchema().optional(),
  })
  .merge(getPaginationSchema(["createdAt", "name"], "createdAt"))
  .strict();

export const createNewSensorLibraryConfigVersionSchema = z
  .object({
    sensorName: getNameSchema(1, 12),
    /** The driver this sensor config is for; its schema checks `config`. */
    sensorDriverId: z.string().uuid(),
    config: z.object({}).passthrough(),
    description: getNameSchema().optional(),
    firmwareVersion: z
      .string()
      .regex(/^[\x21-\x7e]{1,32}$/)
      .optional(),
  })
  .strict();
