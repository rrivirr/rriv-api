import { z } from "zod";
import { AccountIdDto } from "./generic.types.ts";
import {
  deviceBindSchema,
  deviceQuerySchema,
  serialNumberSchema,
} from "../handler/device/schema.ts";

export type BindDeviceDto =
  & z.infer<typeof deviceBindSchema>
  & z.infer<typeof serialNumberSchema>
  & AccountIdDto;

export type UnbindDeviceDto =
  & z.infer<typeof serialNumberSchema>
  & AccountIdDto;

export type QueryDeviceDto =
  & z.input<typeof deviceQuerySchema>
  & AccountIdDto;

export type SerialNumberDeviceDto = z.input<
  typeof serialNumberSchema
>;

export type AccountUniqueDeviceDto = SerialNumberDeviceDto & AccountIdDto;
