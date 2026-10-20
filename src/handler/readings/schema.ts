import { z } from "zod";

export const readingsQuerySchema = z
  .object({
    format: z.enum(["json", "csv"]).optional().default("json"),
    rangeStart: z.coerce.date().optional().default(() =>
      new Date(Date.now() - 5 * 60 * 1000)
    ),
    rangeEnd: z.coerce.date().optional(),
    limit: z.coerce.number().int().min(1).max(100000).optional().default(
      100000,
    ),
    offset: z.coerce.number().int().min(0).optional().default(0),
    order: z.enum(["asc", "desc"]).optional().default("desc"),
  })
  .strict()
  .refine(
    ({ rangeStart, rangeEnd }) => !rangeEnd || +rangeEnd >= +rangeStart,
    { message: "rangeEnd must not be before rangeStart", path: ["rangeEnd"] },
  );

export type ReadingsQuery = z.infer<typeof readingsQuerySchema>;
