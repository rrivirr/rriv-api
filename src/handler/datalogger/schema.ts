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
  config: z.record(z.union([z.string(), z.number(), z.boolean()])),
  dataloggerDriverId: z.string().uuid(),
  deviceId: z.string().uuid(),
  contextId: z.string().uuid(),
  singlePropertyChange: z.boolean(),
  createdAt: z.coerce.date(),
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
  deviceId: z.string().uuid(),
  contextId: z.string().uuid(),
}).strict();

export const dataloggerLibraryConfigQuerySchema = z.object({
  search: getNameSchema().optional(),
  name: getNameSchema().optional(),
  isPublic: booleanQuerySchema,
}).merge(
  getPaginationSchema(["createdAt", "name"], "createdAt"),
).strict();

export const createNewDataloggerLibraryConfigVersionSchema = z.object(
  {
    deviceId: z.string().uuid(),
    contextId: z.string().uuid(),
    description: getNameSchema().optional(),
  },
).strict();
