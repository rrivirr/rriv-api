import { z } from "zod";
import { AccountIdDto, IdDto } from "./generic.types.ts";
import {
  contextGetQueryValidationSchema,
  contextPatchValidationSchema,
  contextPostValidationSchema,
} from "../handler/context/schema.ts";
import {
  createDeviceContextValidationSchema,
  deviceContextParamsValidationSchema,
  updateDeviceContextValidationSchema,
} from "../handler/device-context/schema.ts";

export type CreateContextDto =
  & z.infer<typeof contextPostValidationSchema>
  & AccountIdDto;

export type UpdateContextDto =
  & z.infer<typeof contextPatchValidationSchema>
  & AccountIdDto
  & IdDto;

export type QueryContextDto =
  & z.input<typeof contextGetQueryValidationSchema>
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
