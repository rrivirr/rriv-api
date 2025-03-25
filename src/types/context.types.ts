import { z } from "zod";
import { AccountIdDto, IdDto } from "./generic.types.ts";
import {
  contextQuerySchema,
  createContextSchema,
  updateContextSchema,
} from "../handler/context/schema.ts";
import {
  createDeviceContextSchema,
  deviceContextParamsSchema,
  updateDeviceContextSchema,
} from "../handler/device-context/schema.ts";

export type CreateContextDto =
  & z.infer<typeof createContextSchema>
  & AccountIdDto;

export type UpdateContextDto =
  & z.infer<typeof updateContextSchema>
  & AccountIdDto
  & IdDto;

export type QueryContextDto =
  & z.input<typeof contextQuerySchema>
  & AccountIdDto;

export type UniqueContextDto = { contextId: string } & AccountIdDto;

export type UniqueDeviceContextDto = z.infer<
  typeof deviceContextParamsSchema
>;

export type CreateDeviceContextDto =
  & z.infer<typeof createDeviceContextSchema>
  & UniqueDeviceContextDto
  & AccountIdDto;

export type UpdateDeviceContextDto =
  & z.infer<typeof updateDeviceContextSchema>
  & UniqueDeviceContextDto
  & AccountIdDto;

export type DeviceContextDto =
  & UniqueDeviceContextDto
  & AccountIdDto;
