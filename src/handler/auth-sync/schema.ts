import { z } from "zod";

export const authResourceParamsSchema = z.strictObject({
  resourceType: z.enum(["context", "account"]),
  resourceId: z.string().uuid(),
});

export const listAuthSyncQuerySchema = z.strictObject({
  status: z.enum(["pending", "synced", "failed"]).optional(),
  resourceType: z.enum(["context", "account"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
