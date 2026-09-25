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

export const registerSharedContextSchema = () =>
  swaggerBuilder.addSchema("SharedContext", {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      name: { type: "string" },
      accountId: { type: "string", format: "uuid" },
      startedAt: { type: "string", format: "date-time" },
      endedAt: { type: "string", format: "date-time" },
      Account: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string" },
        },
      },
    },
  });

export const registerRecipientSchema = () =>
  swaggerBuilder.addSchema("Recipient", {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      email: { type: "string" },
      firstName: { type: "string" },
      lastName: { type: "string" },
    },
  });
