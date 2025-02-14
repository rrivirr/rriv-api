import { z } from "zod";
import { Ajv } from "ajv";
import {
  getNameValidationSchema,
  getPaginationValidationSchema,
} from "../generic/generic.schema.ts";

export const createSensorDriverValidationSchema = z.object({
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

export const createSensorConfigValidationSchema = z.object({
  name: getNameValidationSchema(),
  config: z.record(z.union([z.string(), z.number(), z.boolean()])),
  sensorDriverId: z.string().uuid(),
});

export const sensorConfigQueryValidationSchema = z
  .object({
    search: getNameValidationSchema().optional(),
    sensorDriverId: z.string().uuid().optional(),
  })
  .merge(
    getPaginationValidationSchema(["createdAt", "name"], "createdAt"),
  ).strict();

export const sensorDriverQueryValidationSchema = z
  .object({
    search: getNameValidationSchema().optional(),
  })
  .merge(
    getPaginationValidationSchema(["createdAt", "name"], "createdAt"),
  ).strict();

export const createSensorLibraryConfigValidationSchema = z.object({
  name: getNameValidationSchema(),
  sensorConfigId: z.string().uuid(),
}).strict();

export const sensorLibraryConfigQueryValidationSchema = z.object({
  search: getNameValidationSchema().optional(),
}).merge(
  getPaginationValidationSchema(["createdAt", "name"], "createdAt"),
).strict();

export const createNewSensorLibraryConfigVersionValidationSchema = z.object({
  sensorConfigId: z.string().uuid(),
}).strict();
