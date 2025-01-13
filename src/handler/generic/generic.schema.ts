import { z } from "zod";

export const getPaginationValidationSchema = (
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

export const idValidationSchema = z.object({ id: z.string().uuid() }).strict();
