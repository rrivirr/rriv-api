import { z } from "zod";
import { Ajv } from "ajv";
import {
  getNameValidationSchema,
  getPaginationValidationSchema,
} from "../generic/generic.schema.ts";

export const createDataloggerDriverValidationSchema = z.object({
  name: getNameValidationSchema(),
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

export const createDataloggerConfigValidationSchema = z.object({
  name: getNameValidationSchema(),
  config: z.record(z.union([z.string(), z.number(), z.boolean()])),
  dataloggerDriverId: z.string().uuid(),
  deviceId: z.string().uuid(),
  contextId: z.string().uuid(),
  singlePropertyChange: z.boolean(),
  createdAt: z.coerce.date().optional(),
}).strict();

export const dataloggerDriverQueryValidationSchema = z
  .object({
    search: getNameValidationSchema().optional(),
  })
  .merge(
    getPaginationValidationSchema(["createdAt", "name"], "createdAt"),
  ).strict();

export const createDataloggerLibraryConfigValidationSchema = z.object({
  name: getNameValidationSchema(),
  description: getNameValidationSchema().optional(),
  deviceId: z.string().uuid(),
  contextId: z.string().uuid(),
}).strict();

export const dataloggerLibraryConfigQueryValidationSchema = z.object({
  search: getNameValidationSchema().optional(),
  isPublic: z.boolean().optional().default(true),
}).merge(
  getPaginationValidationSchema(["createdAt", "name"], "createdAt"),
).strict();

export const createNewDataloggerLibraryConfigVersionValidationSchema = z.object(
  {
    deviceId: z.string().uuid(),
    contextId: z.string().uuid(),
    description: getNameValidationSchema().optional(),
  },
).strict();
