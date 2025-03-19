import { z } from "zod";
import { AccountIdDto, IdDto } from "./generic.types.ts";
import {
  createDataloggerConfigValidationSchema,
  createDataloggerDriverValidationSchema,
  createDataloggerLibraryConfigValidationSchema,
  createNewDataloggerLibraryConfigVersionValidationSchema,
  dataloggerDriverQueryValidationSchema,
  dataloggerLibraryConfigQueryValidationSchema,
} from "../handler/datalogger/schema.ts";

export type CreateDataloggerDriverDto =
  & z.infer<typeof createDataloggerDriverValidationSchema>
  & AccountIdDto;

export type CreateDataloggerConfigDto =
  & z.infer<typeof createDataloggerConfigValidationSchema>
  & AccountIdDto;

export type QueryDataloggerDriverDto =
  & z.input<typeof dataloggerDriverQueryValidationSchema>
  & { name?: string };

export type CreateDataloggerLibraryConfigDto =
  & z.input<typeof createDataloggerLibraryConfigValidationSchema>
  & AccountIdDto;

export type QueryDataloggerLibraryConfigDto =
  & z.input<typeof dataloggerLibraryConfigQueryValidationSchema>
  & { name?: string; accountId?: string };

export type CreateDataloggerLibraryConfigVersionDto =
  & z.infer<
    typeof createNewDataloggerLibraryConfigVersionValidationSchema
  >
  & IdDto
  & AccountIdDto;
