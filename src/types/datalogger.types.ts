import { z } from "zod";
import { AccountIdDto, IdDto } from "./generic.types.ts";
import {
  createDataloggerConfigSchema,
  createDataloggerDriverSchema,
  createDataloggerLibraryConfigSchema,
  createNewDataloggerLibraryConfigVersionSchema,
  dataloggerDriverQuerySchema,
  dataloggerLibraryConfigQuerySchema,
} from "../handler/datalogger/schema.ts";

export type QueryDataloggerConfigDto = AccountIdDto & {
  configSnapshotId: string;
  active?: boolean;
  order?: "asc" | "desc";
  limit?: number;
  offset?: number;
  asAt?: Date;
};
export type CreateDataloggerDriverDto =
  & z.infer<typeof createDataloggerDriverSchema>
  & AccountIdDto;

export type CreateDataloggerConfigDto =
  & z.infer<typeof createDataloggerConfigSchema>
  & AccountIdDto;

export type QueryDataloggerDriverDto =
  & z.input<typeof dataloggerDriverQuerySchema>
  & { name?: string };

export type CreateDataloggerLibraryConfigDto =
  & z.input<typeof createDataloggerLibraryConfigSchema>
  & AccountIdDto;

export type QueryDataloggerLibraryConfigDto =
  & z.input<typeof dataloggerLibraryConfigQuerySchema>
  & { name?: string; accountId?: string };

export type CreateDataloggerLibraryConfigVersionDto =
  & z.infer<
    typeof createNewDataloggerLibraryConfigVersionSchema
  >
  & IdDto
  & AccountIdDto;
