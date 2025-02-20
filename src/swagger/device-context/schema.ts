import { swaggerBuilder } from "../index.ts";

export const registerDeviceContextSchema = () =>
  swaggerBuilder.addSchema("DeviceContext", {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      deviceId: { type: "string", format: "uuid" },
      contextId: { type: "string", format: "uuid" },
      assignedDeviceName: { type: "string" },
      startedAt: { type: "string", format: "date-time" },
      endedAt: { type: "string", format: "date-time" },
    },
  });
