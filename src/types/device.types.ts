import { z } from "zod";
import { AccountIdDto } from "./generic.types.ts";
import {
  deviceBindValidationSchema,
  deviceGetQueryValidationSchema,
  serialNumberValidationSchema,
} from "../handler/device/schema.ts";

export type BindDeviceDto =
  & z.infer<typeof deviceBindValidationSchema>
  & z.infer<typeof serialNumberValidationSchema>
  & AccountIdDto;

export type UnbindDeviceDto =
  & z.infer<typeof serialNumberValidationSchema>
  & AccountIdDto;

export type QueryDeviceDto =
  & z.input<typeof deviceGetQueryValidationSchema>
  & AccountIdDto;

export type SerialNumberDeviceDto = z.input<
  typeof serialNumberValidationSchema
>;

export type AccountUniqueDeviceDto = SerialNumberDeviceDto & AccountIdDto;
