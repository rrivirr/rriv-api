import { z } from "zod";
import { createAccountSchema } from "../handler/account/schema.ts";

export type CreateAccountDto = z.infer<typeof createAccountSchema>;
