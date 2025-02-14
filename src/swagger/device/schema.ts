import { swaggerBuilder } from "../index.ts";

export const registerDeviceSchema = () =>
  swaggerBuilder.addSchema("Device", {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      serialNumber: { type: "string" },
      uniqueName: { type: "string" },
      createdAt: { type: "string", format: "date-time" },
    },
  });
