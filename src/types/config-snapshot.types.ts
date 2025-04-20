import { z } from "zod";
import { AccountIdDto, IdDto } from "./generic.types.ts";
import {
  activeConfigQuerySchema,
  configSnapshotHistoryQuerySchema,
  configSnapshotLibraryConfigQuerySchema,
  configSnapshotQuerySchema,
  createConfigSnapshotLibraryConfigSchema,
  createNewConfigSnapshotLibraryConfigVersionSchema,
  saveConfigSnapshotSchema,
} from "../handler/config-snapshot/schema.ts";
// @ts-types="generated/index.d.ts"
import { ConfigSnapshot } from "generated/index.js";
import { JsonValue } from "generated/runtime/library.d.ts";

export type SaveConfigSnapshotDto =
  & z.infer<typeof saveConfigSnapshotSchema>
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

export type QueryConfigSnapshotHistoryDto =
  & z.input<
    typeof configSnapshotHistoryQuerySchema
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
