import { z } from "zod";
import {
  booleanQuerySchema,
  getNameSchema,
  getPaginationSchema,
} from "../generic/generic.schema.ts";

export const CONTEXT_NAME_MAX = 30;
const contextNameSchema = () => getNameSchema(3, CONTEXT_NAME_MAX);

export const createContextSchema = z
  .object({ name: contextNameSchema() })
  .strict();

export const contextQuerySchema = z
  .object({
    search: contextNameSchema().optional(),
    name: contextNameSchema().optional(),
    ended: booleanQuerySchema,
  })
  .merge(getPaginationSchema(["startedAt", "endedAt", "name"], "startedAt"))
  .strict();

export const updateContextSchema = z
  .object({
    name: contextNameSchema().optional(),
    end: z.literal(true).optional(),
  })
  .strict()
  .refine((data) => Object.values(data).length, "empty data received");

export const shareSchema = z.object({ email: z.string().email() });
