import { z } from "zod";
import { Ajv } from "ajv";
import {
  booleanQuerySchema,
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
  config: z.object({}).passthrough(),
  sensorDriverId: z.string().uuid(),
  deviceId: z.string().uuid(),
  contextId: z.string().uuid(),
  singlePropertyChange: z.boolean(),
  createdAt: z.coerce.date(),
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
  config: z.object({}).passthrough(),
}).strict();

export const sensorLibraryConfigQuerySchema = z.object({
  search: getNameSchema().optional(),
  name: getNameSchema().optional(),
  isPublic: booleanQuerySchema,
  author: getNameSchema().optional(),
}).merge(
  getPaginationSchema(["createdAt", "name"], "createdAt"),
).strict();

export const createNewSensorLibraryConfigVersionSchema = z.object({
  sensorName: getNameSchema(),
  config: z.object({}).passthrough(),
  description: getNameSchema().optional(),
}).strict();
