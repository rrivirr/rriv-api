import { z } from "zod";
import { idValidationSchema } from "../handler/generic/generic.schema.ts";

export type AccountIdDto = {
  accountId: string;
};

export type IdDto = z.infer<typeof idValidationSchema>;
