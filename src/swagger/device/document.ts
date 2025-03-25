import { generateSchema } from "@anatine/zod-openapi";
import { ParameterObject } from "npm:openapi3-ts@^4.4.0/oas31";
import {
  deviceBindSchema,
  deviceQuerySchema,
} from "../../handler/device/schema.ts";
import { registerDeviceSchema } from "./schema.ts";
import { swaggerBuilder } from "../index.ts";
import { serialNumberSchema } from "../../handler/device/schema.ts";

export const basePath = "/device";
const tags = ["device"];
const contextRef = "#/components/schemas/Device";
const mediaTypeHeader = "application/json";
const singleDeviceResponse = {
  content: {
    [mediaTypeHeader]: {
      schema: { $ref: contextRef },
    },
  },
};
registerDeviceSchema();
const DeviceQuerySchema = generateSchema(deviceQuerySchema);
const DeviceQuerySchemaProperties = DeviceQuerySchema.properties;

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
            schema: { type: "array", items: { $ref: contextRef } },
          },
        },
      },
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
    requestBody: {
      content: {
        [mediaTypeHeader]: {
          schema: generateSchema(deviceBindSchema),
        },
      },
    },
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
