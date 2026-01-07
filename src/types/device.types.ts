import { z } from "zod";
import { AccountIdDto } from "./generic.types.ts";
import {
  createFirmwareEntrySchema,
  deviceQuerySchema,
  firmwareHistoryQuerySchema,
  provisionDeviceSchema,
  registerEuiSchema,
  serialNumberSchema,
} from "../handler/device/schema.ts";

export type RegisterEuiDto =
  & z.infer<typeof registerEuiSchema>
  & AccountIdDto;
export type CreateFirmwareEntryDto =
  & z.infer<typeof createFirmwareEntrySchema>
  & AccountIdDto;
export type QueryFirmwareHistoryDto =
  & z.infer<typeof firmwareHistoryQuerySchema>
  & AccountIdDto;
export type ProvisionDeviceDto =
  & z.infer<typeof provisionDeviceSchema>
  & AccountIdDto;

export type BindDeviceDto =
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
