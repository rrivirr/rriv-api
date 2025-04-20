import { z } from "zod";
import { getNameSchema } from "../generic/generic.schema.ts";

export const createDeviceContextSchema = z.object({
  assignedDeviceName: getNameSchema(),
}).strict();

export const updateDeviceContextSchema = z.object({
  assignedDeviceName: getNameSchema().optional(),
  end: z.literal(true).optional(),
}).strict().refine(
  (data) => Object.values(data).length,
  "empty data received",
);

export const deviceContextParamsSchema = z.object({
  deviceId: z.string().uuid(),
  contextId: z.string().uuid(),
}).strict();
