import { z } from "zod";
import {
  getNameSchema,
  getPaginationSchema,
} from "../generic/generic.schema.ts";

export const deviceBindSchema = z.object({
  uniqueName: z.string().min(3).max(25).trim().optional(),
});

export const deviceQuerySchema = z
  .object({
    search: getNameSchema().optional(),
    serialNumber: z.string().min(3).max(25).trim().optional(),
    uniqueName: z.string().min(3).max(25).trim().optional(),
    id: z.string().uuid().optional(),
    contextId: z.string().uuid().optional(),
  })
  .merge(
    getPaginationSchema(
      ["createdAt", "uniqueName", "serialNumber"],
      "createdAt",
    ),
  )
  .strict();

export const serialNumberSchema = z.object({
  serialNumber: z.string().min(3).max(25).trim(),
})
  .strict();
