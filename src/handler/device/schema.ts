import { z } from "zod";
import {
  getNameSchema,
  getPaginationSchema,
} from "../generic/generic.schema.ts";

export const deviceBindSchema = z.object({
  uniqueName: getNameSchema().optional(),
});

export const deviceQuerySchema = z
  .object({
    search: getNameSchema().optional(),
    serialNumber: getNameSchema().optional(),
    uniqueName: getNameSchema().optional(),
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
  serialNumber: getNameSchema(),
})
  .strict();
