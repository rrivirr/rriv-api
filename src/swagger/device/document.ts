import { generateSchema } from "@anatine/zod-openapi";
import { ParameterObject } from "npm:openapi3-ts@^4.4.0/oas31";
import {
  createFirmwareEntrySchema,
  createLogSchema,
  deviceQuerySchema,
  firmwareHistoryQuerySchema,
  logsQuerySchema,
  provisionDeviceSchema,
  registerEuiSchema,
  sendCommandSchema,
} from "../../handler/device/schema.ts";
import {
  registerDeviceFirmwareItemSchema,
  registerDeviceLogSchema,
  registerDeviceSchema,
} from "./schema.ts";
import { swaggerBuilder } from "../index.ts";
import { readingsQuerySchema } from "../../handler/readings/schema.ts";
import { serialNumberSchema } from "../../handler/device/schema.ts";

export const basePath = "/device";
const tags = ["device"];
const deviceRef = "#/components/schemas/Device";
const deviceLogRef = "#/components/schemas/DeviceLog";
const mediaTypeHeader = "application/json";
const singleDeviceResponse = {
  content: {
    [mediaTypeHeader]: {
      schema: { $ref: deviceRef },
    },
  },
};
registerDeviceSchema();
registerDeviceFirmwareItemSchema();
registerDeviceLogSchema();
const DeviceQuerySchema = generateSchema(deviceQuerySchema);
const DeviceQuerySchemaProperties = DeviceQuerySchema.properties;
const LogsQuerySchema = generateSchema(logsQuerySchema);
const LogsQuerySchemaProperties = LogsQuerySchema.properties;
const FirmwareHistoryQuerySchema = generateSchema(firmwareHistoryQuerySchema);

swaggerBuilder.addPath(basePath, {
  get: {
    tags,
    summary: `Get user's list of devices`,
    parameters: [
      ...Object.keys(DeviceQuerySchemaProperties as object).map((
        q: string,
      ) =>
        ({
          name: q,
          in: "query",
          schema: { ...DeviceQuerySchemaProperties![q] },
        }) as ParameterObject
      ),
    ],
    responses: {
      200: {
        content: {
          [mediaTypeHeader]: {
            schema: { type: "array", items: { $ref: deviceRef } },
          },
        },
      },
    },
  },
  post: {
    tags,
    summary: `provision a new device`,
    description:
      "Requires the `provisioner` role on the system (admins are implied). An existing device with the same uid is returned with 200.",
    requestBody: {
      content: {
        [mediaTypeHeader]: {
          schema: generateSchema(provisionDeviceSchema),
        },
      },
    },
    responses: {
      201: singleDeviceResponse,
      200: singleDeviceResponse,
      403: { description: "The caller isn't a provisioner." },
    },
  },
});

swaggerBuilder.addPath(`${basePath}/:serialNumber/bind`, {
  post: {
    tags,
    summary: `bind a device to your account`,
    parameters: [{
      name: "id",
      in: "path",
      schema: generateSchema(serialNumberSchema)
        .properties!["serialNumber"],
    }],
    responses: {
      201: singleDeviceResponse,
      200: singleDeviceResponse,
    },
  },
});

swaggerBuilder.addPath(`${basePath}/:serialNumber/unbind`, {
  post: {
    tags,
    summary: `unbind a device from your account`,
    parameters: [{
      name: "id",
      in: "path",
      schema: generateSchema(serialNumberSchema)
        .properties!["serialNumber"],
    }],
    responses: {
      200: singleDeviceResponse,
    },
  },
});

swaggerBuilder.addPath(`${basePath}/registerEui`, {
  post: {
    tags,
    requestBody: {
      content: {
        [mediaTypeHeader]: {
          schema: generateSchema(registerEuiSchema),
        },
      },
    },
    responses: {
      200: {},
      201: {},
    },
  },
});

swaggerBuilder.addPath(`${basePath}/sendCommand`, {
  post: {
    tags,
    requestBody: {
      content: {
        [mediaTypeHeader]: {
          schema: generateSchema(sendCommandSchema),
        },
      },
    },
    responses: {
      200: {
        content: {
          [mediaTypeHeader]: {
            schema: {
              type: "object",
              properties: {
                responseId: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
});

swaggerBuilder.addPath(`${basePath}/:serialNumber`, {
  delete: {
    tags,
    parameters: [{
      name: "id",
      in: "path",
      schema: generateSchema(serialNumberSchema)
        .properties!["serialNumber"],
    }],
    responses: {
      200: singleDeviceResponse,
    },
  },
});

swaggerBuilder.addPath(`${basePath}/firmware/history`, {
  get: {
    tags,
    parameters: [{
      name: "query",
      in: "query",
      schema: {
        type: "object",
        ...FirmwareHistoryQuerySchema, // OneOf does not integrate well with query param
      },
    }],
    responses: {
      200: {
        content: {
          [mediaTypeHeader]: {
            schema: {
              type: "array",
              items: { $ref: "#/components/schemas/DeviceFirmwareItem" },
            },
          },
        },
      },
    },
  },
  post: {
    tags,
    requestBody: {
      content: {
        [mediaTypeHeader]: {
          schema: generateSchema(createFirmwareEntrySchema),
        },
      },
    },
    responses: {
      200: {},
    },
  },
});

swaggerBuilder.addPath(`${basePath}/log`, {
  get: {
    tags,
    parameters: [
      ...Object.keys(LogsQuerySchemaProperties as object).map((
        q: string,
      ) =>
        ({
          name: q,
          in: "query",
          schema: { ...LogsQuerySchemaProperties![q] },
        }) as ParameterObject
      ),
    ],
    responses: {
      200: {
        content: {
          [mediaTypeHeader]: {
            schema: { type: "array", items: { $ref: deviceLogRef } },
          },
        },
      },
    },
  },
  post: {
    tags,
    requestBody: {
      content: {
        [mediaTypeHeader]: {
          schema: generateSchema(createLogSchema),
        },
      },
    },
    responses: {
      200: {},
    },
  },
});

swaggerBuilder.addPath(`${basePath}/{id}/readings`, {
  get: {
    tags,
    summary: `a device's readings, limited to what the caller may see`,
    description: [
      "Readings come from the internal data-api. They are limited to the",
      "times an EUI belonged to the device and, within that, to the",
      "caller's own ownership periods and the device's time in a context the",
      "caller belongs to (within the owner's period). Admins see every period",
      "an EUI belonged to the device. Periods the caller may not see are",
      "simply absent.",
    ].join(" "),
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: "id",
        in: "path",
        required: true,
        schema: { type: "string", format: "uuid" },
      },
      ...Object.entries(
        generateSchema(readingsQuerySchema).properties ?? {},
      ).map(([name, schema]) =>
        ({ name, in: "query", schema }) as ParameterObject
      ),
    ],
    responses: {
      200: {
        description:
          "Readings: a flat object of the device's channels plus an ISO `timestamp` per row (JSON), or a CSV attachment.",
        content: {
          [mediaTypeHeader]: {
            schema: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  timestamp: { type: "string", format: "date-time" },
                },
                additionalProperties: true,
              },
            },
          },
          "text/csv": { schema: { type: "string" } },
        },
      },
      404: {
        description:
          "Device not found or not visible to the caller (CSV: no readings in range).",
      },
      422: { description: "Invalid query (e.g. rangeEnd before rangeStart)." },
      503: {
        description:
          "data-api isn't configured, or the authentication service is unavailable.",
      },
    },
  },
});
