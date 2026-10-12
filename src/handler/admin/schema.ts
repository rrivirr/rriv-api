import { z } from "zod";
import { SYSTEM_ROLES } from "../../service/admin.service.ts";

export const grantAdminSchema = z
  .object({ email: z.string().email() })
  .strict();

export const systemRoleSchema = z.enum(SYSTEM_ROLES);

export const grantRoleSchema = z
  .object({ email: z.string().email(), role: systemRoleSchema })
  .strict();

export const revokeRoleParamsSchema = z.object({
  role: systemRoleSchema,
  id: z.string().uuid(),
});
