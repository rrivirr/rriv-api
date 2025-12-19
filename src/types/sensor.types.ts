import { z } from "zod";
import { AccountIdDto, IdDto } from "./generic.types.ts";
import {
  createNewSensorLibraryConfigVersionSchema,
  createSensorConfigSchema,
  createSensorDriverSchema,
  createSensorLibraryConfigSchema,
  sensorDriverQuerySchema,
  sensorLibraryConfigQuerySchema,
} from "../handler/sensor/schema.ts";

export type CreateSensorDriverDto =
  & z.infer<typeof createSensorDriverSchema>
  & AccountIdDto;

export type CreateSensorConfigDto =
  & z.infer<typeof createSensorConfigSchema>
  & AccountIdDto;

export type QuerySensorConfigDto =
  & AccountIdDto
  & {
    name?: string;
    configSnapshotId: string;
    active?: boolean;
    order?: "asc" | "desc";
    limit?: number;
    offset?: number;
  };

export type QuerySensorDriverDto =
  & z.input<typeof sensorDriverQuerySchema>
  & { name?: string };

export type CreateSensorLibraryConfigDto =
  & z.input<typeof createSensorLibraryConfigSchema>
  & AccountIdDto;

export type QuerySensorLibraryConfigDto =
  & z.input<typeof sensorLibraryConfigQuerySchema>
  & { name?: string; accountId?: string };

export type CreateSensorLibraryConfigVersionDto =
  & z.infer<
    typeof createNewSensorLibraryConfigVersionSchema
  >
  & IdDto
  & AccountIdDto;
