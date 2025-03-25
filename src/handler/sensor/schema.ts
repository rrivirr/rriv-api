import { z } from "zod";
import { Ajv } from "ajv";
import {
  getNameSchema,
  getPaginationSchema,
} from "../generic/generic.schema.ts";

export const createSensorDriverSchema = z.object({
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

export const createSensorConfigSchema = z.object({
  name: getNameSchema(),
  config: z.record(z.union([z.string(), z.number(), z.boolean()])),
  sensorDriverId: z.string().uuid(),
  deviceId: z.string().uuid(),
  contextId: z.string().uuid(),
  singlePropertyChange: z.boolean(),
  createdAt: z.coerce.date().optional(),
}).strict();

export const sensorDriverQuerySchema = z
  .object({
    search: getNameSchema().optional(),
  })
  .merge(
    getPaginationSchema(["createdAt", "name"], "createdAt"),
  ).strict();

export const createSensorLibraryConfigSchema = z.object({
  name: getNameSchema(),
  description: getNameSchema().optional(),
  sensorConfigId: z.string().uuid(),
}).strict();

export const sensorLibraryConfigQuerySchema = z.object({
  search: getNameSchema().optional(),
  isPublic: z.boolean().optional().default(true),
}).merge(
  getPaginationSchema(["createdAt", "name"], "createdAt"),
).strict();

export const createNewSensorLibraryConfigVersionSchema = z.object({
  sensorConfigId: z.string().uuid(),
  description: getNameSchema().optional(),
}).strict();
