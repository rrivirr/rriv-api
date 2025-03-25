import { z } from "zod";
import {
  getNameSchema,
  getPaginationSchema,
} from "../generic/generic.schema.ts";

export const createContextSchema = z
  .object({ name: getNameSchema() })
  .strict();

export const contextQuerySchema = z
  .object({
    search: getNameSchema().optional(),
    name: getNameSchema().optional(),
    deviceId: z.string().uuid().optional(),
  })
  .merge(
    getPaginationSchema(
      ["startedAt", "endedAt", "name"],
      "startedAt",
    ),
  )
  .strict();

export const updateContextSchema = z.object({
  name: getNameSchema().optional(),
  end: z.literal(true).optional(),
}).strict().refine(
  (data) => Object.values(data).length,
  "empty data received",
);
