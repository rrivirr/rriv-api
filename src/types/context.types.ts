import { z } from "zod";
import { AccountIdDto, IdDto } from "./generic.types.ts";
import {
  contextQueryValidationSchema,
  createContextValidationSchema,
  updateContextValidationSchema,
} from "../handler/context/schema.ts";
import {
  createDeviceContextValidationSchema,
  deviceContextParamsValidationSchema,
  updateDeviceContextValidationSchema,
} from "../handler/device-context/schema.ts";

export type CreateContextDto =
  & z.infer<typeof createContextValidationSchema>
  & AccountIdDto;

export type UpdateContextDto =
  & z.infer<typeof updateContextValidationSchema>
  & AccountIdDto
  & IdDto;

export type QueryContextDto =
  & z.input<typeof contextQueryValidationSchema>
  & AccountIdDto
  & { name?: string };

export type UniqueContextDto = { contextId: string } & AccountIdDto;

export type UniqueDeviceContextDto = z.infer<
  typeof deviceContextParamsValidationSchema
>;

export type CreateDeviceContextDto =
  & z.infer<typeof createDeviceContextValidationSchema>
  & UniqueDeviceContextDto
  & AccountIdDto;

export type UpdateDeviceContextDto =
  & z.infer<typeof updateDeviceContextValidationSchema>
  & UniqueDeviceContextDto
  & AccountIdDto;

export type DeleteDeviceContextDto =
  & UniqueDeviceContextDto
  & AccountIdDto;
