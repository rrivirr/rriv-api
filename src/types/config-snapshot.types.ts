import { z } from "zod";
import { AccountIdDto, IdDto } from "./generic.types.ts";
import {
  activeConfigQuerySchema,
  configHistoryQuerySchema,
  configSnapshotLibraryConfigQuerySchema,
  configSnapshotQuerySchema,
  createConfigSnapshotLibraryConfigSchema,
  createNewConfigSnapshotLibraryConfigVersionSchema,
  overwriteActiveConfigSnapshotSchema,
  saveConfigSnapshotSchema,
  updateLibraryConfigSchema,
} from "../handler/config-snapshot/schema.ts";
import { ConfigSnapshot } from "generated/client.ts";
import { JsonValue } from "generated/internal/prismaNamespace.ts";

export type UpdateLibraryConfigDto =
  & z.infer<typeof updateLibraryConfigSchema>
  & AccountIdDto
  & IdDto;

export type SaveConfigSnapshotDto =
  & z.infer<typeof saveConfigSnapshotSchema>
  & AccountIdDto;

export type OverwriteActiveConfigSnapshotDto =
  & z.infer<typeof overwriteActiveConfigSnapshotSchema>
  & AccountIdDto;

export type QueryConfigSnapshotDto =
  & z.input<typeof configSnapshotQuerySchema>
  & AccountIdDto
  & { active?: boolean; name?: string };

export type QueryActiveConfigDto =
  & z.input<
    typeof activeConfigQuerySchema
  >
  & AccountIdDto;

export type QueryConfigHistoryDto =
  & z.input<
    typeof configHistoryQuerySchema
  >
  & AccountIdDto;

export type CreateConfigSnapshotLibraryConfigDto =
  & z.input<typeof createConfigSnapshotLibraryConfigSchema>
  & AccountIdDto;

export type QueryConfigSnapshotLibraryConfigDto =
  & z.input<typeof configSnapshotLibraryConfigQuerySchema>
  & { accountId?: string; name?: string };

export type CreateConfigSnapshotLibraryConfigVersionDto =
  & z.infer<
    typeof createNewConfigSnapshotLibraryConfigVersionSchema
  >
  & IdDto
  & AccountIdDto;

export type ConfigSnapshotDto = ConfigSnapshot & {
  SensorConfig: {
    name: string;
    config: JsonValue;
    sensorDriverId: string;
  }[];
  DataloggerConfig: {
    name: string;
    config: JsonValue;
    dataloggerDriverId: string;
  }[];
};
