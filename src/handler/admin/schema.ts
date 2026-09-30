import { z } from "zod";

export const grantAdminSchema = z
  .object({ email: z.string().email() })
  .strict();
