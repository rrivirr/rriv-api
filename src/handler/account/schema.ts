import { z } from "zod";
import { getNameSchema } from "../generic/generic.schema.ts";

export const createAccountSchema = z
  .strictObject({
    firstName: getNameSchema(),
    lastName: getNameSchema(),
    email: z.string().email(),
    password: z.string().min(5),
    phone: z.string().max(15).optional(),
  });

export const emailSchema = z.strictObject({
  email: z.string().email(),
});
