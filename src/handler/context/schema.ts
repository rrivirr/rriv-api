import { z } from "zod";
import { getPaginationValidationSchema } from "../generic/generic.schema.ts";

export const contextPostValidationSchema = z
  .object({
    name: z.string().min(3).max(20).trim().toLowerCase(),
  })
  .strict();

export const contextGetQueryValidationSchema = z
  .object({
    search: z.string().max(20).trim().optional(),
    deviceId: z.string().uuid().optional(),
  })
  .merge(
    getPaginationValidationSchema(
      ["startedAt", "endedAt", "name"],
      "startedAt",
    ),
  )
  .strict();

export const contextPatchValidationSchema = z.object({
  name: z.string().min(3).max(20).trim().toLowerCase().optional(),
  end: z.literal(true).optional(),
}).strict().refine(
  (data) => Object.values(data).length,
  "empty data received",
);
