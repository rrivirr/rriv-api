import { swaggerBuilder } from "../index.ts";

export const registerSensorConfigSchema = () =>
  swaggerBuilder.addSchema("SensorConfig", {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      name: { type: "string" },
      config: { type: "object" },
      sensorDriverId: { type: "string", format: "uuid" },
      active: { type: "boolean" },
      createdAt: { type: "string", format: "date-time" },
      deactivatedAt: { type: "string", format: "date-time" },
    },
  });

export const registerSensorDriverSchema = () =>
  swaggerBuilder.addSchema("SensorDriver", {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      name: { type: "string" },
      validation: { type: "object" },
      createdAt: { type: "string", format: "date-time" },
      creator: {
        type: "object",
        properties: {
          firstName: { type: "string" },
          lastName: { type: "string" },
        },
      },
    },
  });

export const registerSensorLibraryConfig = () =>
  swaggerBuilder.addSchema("SensorLibraryConfig", {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      name: { type: "string" },
      createdAt: { type: "string", format: "date-time" },
      creator: {
        type: "object",
        properties: {
          firstName: { type: "string" },
          lastName: { type: "string" },
        },
      },
    },
  });

export const registerSensorLibraryConfigById = () =>
  swaggerBuilder.addSchema("SensorLibraryConfigById", {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      name: { type: "string" },
      description: { type: "string" },
      createdAt: { type: "string", format: "date-time" },
      Creator: {
        type: "object",
        properties: {
          firstName: { type: "string" },
          lastName: { type: "string" },
        },
      },
      SensorLibraryConfigVersion: {
        type: "array",
        items: {
          type: "object",
          properties: {
            version: { type: "number" },
            description: { type: "string" },
            Creator: {
              type: "object",
              properties: {
                firstName: { type: "string" },
                lastName: { type: "string" },
              },
            },
            SensorConfig: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                name: { type: "string" },
                config: { type: "object" },
                sensorDriverId: { type: "string" },
              },
            },
          },
        },
      },
    },
  });
