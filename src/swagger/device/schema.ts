import { swaggerBuilder } from "../index.ts";

export const registerDeviceSchema = () =>
  swaggerBuilder.addSchema("Device", {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      serialNumber: { type: "string" },
      uniqueName: { type: "string" },
      createdAt: { type: "string", format: "date-time" },
      DeviceContext: {
        type: "array",
        items: {
          type: "object",
          properties: {
            Context: {
              type: "object",
              properties: {
                name: { type: "string" },
              },
            },
            assignedDeviceName: { type: "string" },
          },
        },
      },
    },
  });
