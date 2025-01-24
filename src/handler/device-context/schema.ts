import { z } from "zod";

export const createDeviceContextValidationSchema = z.object({
  assignedDeviceName: z.string().min(3).max(20).trim().toLowerCase(),
}).strict();

export const updateDeviceContextValidationSchema = z.object({
  assignedDeviceName: z.string().min(3).max(20).trim().toLowerCase().optional(),
  end: z.literal(true).optional(),
}).strict().refine(
  (data) => Object.values(data).length,
  "empty data received",
);

export const deviceContextParamsValidationSchema = z.object({
  deviceId: z.string().uuid(),
  contextId: z.string().uuid(),
});
