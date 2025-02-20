import { z } from "zod";
import {
  getNameValidationSchema,
  getPaginationValidationSchema,
} from "../generic/generic.schema.ts";

export const createContextValidationSchema = z
  .object({ name: getNameValidationSchema() })
  .strict();

export const contextQueryValidationSchema = z
  .object({
    search: getNameValidationSchema().optional(),
    name: getNameValidationSchema().optional(),
    deviceId: z.string().uuid().optional(),
  })
  .merge(
    getPaginationValidationSchema(
      ["startedAt", "endedAt", "name"],
      "startedAt",
    ),
  )
  .strict();

export const updateContextValidationSchema = z.object({
  name: getNameValidationSchema().optional(),
  end: z.literal(true).optional(),
}).strict().refine(
  (data) => Object.values(data).length,
  "empty data received",
);
