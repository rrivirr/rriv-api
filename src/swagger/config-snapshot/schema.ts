import { swaggerBuilder } from "../index.ts";

export const registerConfigSnapshotSchema = () =>
  swaggerBuilder.addSchema("ConfigSnapshot", {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      name: { type: "string" },
      createdAt: { type: "string", format: "date-time" },
      active: { type: "boolean" },
      deviceContextId: { type: "string", format: "uuid" },
      dataloggerConfig: {
        type: "array",
        items: {
          type: "object",
          properties: {
            config: { type: "object" },
          },
        },
      },
      sensorConfig: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            config: { type: "object" },
          },
        },
      },
    },
  });

export const registerActiveConfigSnapshotSchema = () =>
  swaggerBuilder.addSchema("ActiveConfigSnapshot", {
    type: "object",
    properties: {
      dataloggerConfig: { type: "object" },
      sensorConfig: { type: "array", items: { type: "object" } },
    },
  });

export const registerConfigSnapshotHistorySchema = () =>
  swaggerBuilder.addSchema("ConfigSnapshotHistory", {
    type: "object",
    properties: {
      dataloggerConfigs: {
        type: "array",
        items: {
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
          },
        },
      },
      sensorConfigs: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            config: { type: "object" },
            sensorDriverId: { type: "string", format: "uuid" },
            sensorDriver: {
              type: "object",
              properties: {
                name: { type: "string" },
              },
            },
            active: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
            deactivatedAt: { type: "string", format: "date-time" },
            changesMade: { type: "object" },
          },
        },
      },
    },
  });

export const registerConfigSnapshotLibraryConfig = () =>
  swaggerBuilder.addSchema("ConfigSnapshotLibraryConfig", {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      name: { type: "string" },
      createdAt: { type: "string", format: "date-time" },
      description: { type: "string" },
      creator: {
        type: "object",
        properties: {
          firstName: { type: "string" },
          lastName: { type: "string" },
        },
      },
    },
  });

export const registerConfigSnapshotLibraryConfigById = () =>
  swaggerBuilder.addSchema("ConfigSnapshotLibraryConfigById", {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      name: { type: "string" },
      createdAt: { type: "string", format: "date-time" },
      description: { type: "string" },
      creator: {
        type: "object",
        properties: {
          firstName: { type: "string" },
          lastName: { type: "string" },
        },
      },
      SystemLibraryConfigVersion: {
        type: "array",
        items: {
          type: "object",
          properties: {
            version: { type: "number" },
            creator: {
              type: "object",
              properties: {
                firstName: { type: "string" },
                lastName: { type: "string" },
              },
            },
            ConfigSnapshot: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                name: { type: "string" },
                SensorConfig: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      config: { type: "object" },
                    },
                  },
                },
                DataloggerConfig: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      config: { type: "object" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
