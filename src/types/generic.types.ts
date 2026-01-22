import { z } from "zod";
import { idSchema } from "../handler/generic/generic.schema.ts";

export type AccountIdDto = {
  accountId: string;
};

export type IdDto = z.infer<typeof idSchema>;
export type IdorNameDto = { name: string } | { id: string };
