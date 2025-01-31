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
