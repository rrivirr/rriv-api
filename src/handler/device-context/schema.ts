import { z } from "zod";
import { getNameValidationSchema } from "../generic/generic.schema.ts";

export const createDeviceContextValidationSchema = z.object({
  assignedDeviceName: getNameValidationSchema(),
}).strict();

export const updateDeviceContextValidationSchema = z.object({
  assignedDeviceName: getNameValidationSchema().optional(),
  end: z.literal(true).optional(),
}).strict().refine(
  (data) => Object.values(data).length,
  "empty data received",
);

export const deviceContextParamsValidationSchema = z.object({
  deviceId: z.string().uuid(),
  contextId: z.string().uuid(),
}).strict();
