import { swaggerBuilder } from "../index.ts";

export const registerDataloggerConfigSchema = () =>
  swaggerBuilder.addSchema("DataloggerConfig", {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      name: { type: "string" },
      config: { type: "object" },
      dataloggerDriverId: { type: "string", format: "uuid" },
      configSnapshotId: { type: "string", format: "uuid" },
      dataloggerDriver: {
        type: "object",
        properties: {
          name: { type: "string" },
        },
      },
      active: { type: "boolean" },
      createdAt: { type: "string", format: "date-time" },
      deactivatedAt: { type: "string", format: "date-time" },
    },
  });

export const registerDataloggerConfigHistorySchema = () =>
  swaggerBuilder.addSchema("DataloggerConfigHistory", {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      changesMade: { type: "object" },
      name: { type: "string" },
      config: { type: "object" },
      dataloggerDriverId: { type: "string", format: "uuid" },
      configSnapshotId: { type: "string", format: "uuid" },
      active: { type: "boolean" },
      createdAt: { type: "string", format: "date-time" },
      deactivatedAt: { type: "string", format: "date-time" },
      ConfigSnapshot: {
        type: "object",
        properties: {
          DeviceContext: {
            type: "object",
            properties: {
              Context: {
                type: "object",
                properties: {
                  name: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
  });

export const registerDataloggerDriverSchema = () =>
  swaggerBuilder.addSchema("DataloggerDriver", {
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

export const registerDataloggerLibraryConfig = () =>
  swaggerBuilder.addSchema("DataloggerLibraryConfig", {
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

export const registerDataloggerLibraryConfigById = () =>
  swaggerBuilder.addSchema("DataloggerLibraryConfigById", {
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
      DataloggerLibraryConfigVersion: {
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
            DataloggerConfig: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                name: { type: "string" },
                config: { type: "object" },
                dataloggerDriverId: { type: "string" },
              },
            },
          },
        },
      },
    },
  });
