import { z } from "zod";

export const getPaginationSchema = (
  orderByAllowedFields: [string, ...string[]],
  defaultOrderByValue: string,
) =>
  z.object({
    limit: z.number().int().min(1).max(100).optional().default(100),
    offset: z.number().int().min(0).max(100).optional().default(0),
    order: z.enum(["asc", "desc"]).optional().default("desc"),
    orderBy: z
      .enum(orderByAllowedFields)
      .optional()
      .default(defaultOrderByValue),
  }).strict();

export const idSchema = z.object({ id: z.string().uuid() }).strict();

export const getNameSchema = (min: number = 3, max: number = 20) =>
  z.string().min(min).max(max).trim().toLowerCase();
