import { z } from "zod";
import { getPaginationValidationSchema } from "../generic/generic.schema.ts";

export const deviceBindValidationSchema = z.object({
  uniqueName: z.string().min(3).max(25).trim().toLowerCase().optional(),
});

export const deviceGetQueryValidationSchema = z
  .object({
    search: z.string().max(20).trim().optional(),
    contextId: z.string().uuid().optional(),
  })
  .merge(
    getPaginationValidationSchema(
      ["createdAt", "uniqueName", "serialNumber"],
      "createdAt",
    ),
  )
  .strict();

export const serialNumberValidationSchema = z.object({
  serialNumber: z.string().min(3).max(25).trim().toLowerCase(),
})
  .strict();
