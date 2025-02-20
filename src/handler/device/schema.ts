import { z } from "zod";
import {
  getNameValidationSchema,
  getPaginationValidationSchema,
} from "../generic/generic.schema.ts";

export const deviceBindValidationSchema = z.object({
  uniqueName: getNameValidationSchema().optional(),
});

export const deviceQueryValidationSchema = z
  .object({
    search: getNameValidationSchema().optional(),
    serialNumber: getNameValidationSchema().optional(),
    uniqueName: getNameValidationSchema().optional(),
    id: z.string().uuid().optional(),
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
  serialNumber: getNameValidationSchema(),
})
  .strict();
