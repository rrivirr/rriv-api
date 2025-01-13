import { z } from "zod";
import { AccountIdDto } from "../generic/accountId-dto.type.ts";
import { getPaginationValidationSchema } from "../generic/generic.schema.ts";

export const contextPostValidationSchema = z
  .object({
    name: z.string().min(3).max(20).trim(),
  })
  .strict();

export const contextGetQueryValidationSchema = z
  .object({
    search: z.string().max(20).trim().optional(),
  })
  .merge(
    getPaginationValidationSchema(
      ["startedAt", "endedAt", "name"],
      "startedAt",
    ),
  )
  .strict();

export const contextPatchValidationSchema = z.object({
  name: z.string().min(3).max(20).trim().optional(),
  archive: z.literal(true).optional(), // or delete
  end: z.literal(true).optional(),
}).strict().refine(
  (data) => Object.values(data).length,
  "empty data received",
);

export type CreateContextDto =
  & z.infer<typeof contextPostValidationSchema>
  & AccountIdDto;

export type UpdateContextDto =
  & z.infer<typeof contextPatchValidationSchema>
  & AccountIdDto
  & { id: string };

export type QueryContextDto =
  & z.input<typeof contextGetQueryValidationSchema>
  & AccountIdDto
  & { name?: string };
