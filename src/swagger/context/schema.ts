import { swaggerBuilder } from "../index.ts";

export const registerContextSchema = () =>
  swaggerBuilder.addSchema("Context", {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      name: { type: "string" },
      accountId: { type: "string", format: "uuid" },
      startedAt: { type: "string", format: "date-time" },
      endedAt: { type: "string", format: "date-time" },
    },
  });
