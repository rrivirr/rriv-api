import { z } from "zod";
import { SYSTEM_ROLES } from "../../service/admin.service.ts";
import { LIBRARY_KINDS } from "../../service/library-official.service.ts";

export const systemRoleSchema = z.enum(SYSTEM_ROLES);

export const grantRoleSchema = z
  .object({ email: z.string().email(), role: systemRoleSchema })
  .strict();

export const revokeRoleParamsSchema = z.object({
  role: systemRoleSchema,
  id: z.string().uuid(),
});

export const libraryOfficialParamsSchema = z.object({
  kind: z.enum(LIBRARY_KINDS),
  id: z.string().uuid(),
});

export const libraryOfficialBodySchema = z
  .object({ isOfficial: z.boolean() })
  .strict();
