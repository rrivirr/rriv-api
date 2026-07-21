import { z } from "zod";
import {
  booleanQuerySchema,
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
    ended: booleanQuerySchema,
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

export const shareSchema = z.object({ email: z.string().email() });
