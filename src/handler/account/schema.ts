import { z } from "zod";
import { getNameSchema } from "../generic/generic.schema.ts";

export const createAccountSchema = z
  .object({
    firstName: getNameSchema(),
    lastName: getNameSchema(),
    email: z.string().email(),
    password: z.string().min(5),
    phone: z.string().max(13),
  })
  .strict();
