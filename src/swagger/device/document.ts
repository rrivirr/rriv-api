import { generateSchema } from "@anatine/zod-openapi";
import { ParameterObject } from "npm:openapi3-ts@^4.4.0/oas31";
import {
  deviceBindValidationSchema,
  deviceGetQueryValidationSchema,
} from "../../handler/device/schema.ts";
import { registerDeviceSchema } from "./schema.ts";
import { swaggerBuilder } from "../index.ts";
import { serialNumberValidationSchema } from "../../handler/device/schema.ts";

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
const DeviceGetQuerySchema = generateSchema(deviceGetQueryValidationSchema);
const DeviceGetQuerySchemaProperties = DeviceGetQuerySchema.properties;

swaggerBuilder.addPath(basePath, {
  get: {
    tags,
    summary: `Get user's list of devices`,
    parameters: [
      ...Object.keys(DeviceGetQuerySchemaProperties as object).map((
        q: string,
      ) =>
        ({
          name: q,
          in: "query",
          schema: { ...DeviceGetQuerySchemaProperties![q] },
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
      schema: generateSchema(serialNumberValidationSchema)
        .properties!["serialNumber"],
    }],
    requestBody: {
      content: {
        [mediaTypeHeader]: {
          schema: generateSchema(deviceBindValidationSchema),
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
      schema: generateSchema(serialNumberValidationSchema)
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
      schema: generateSchema(serialNumberValidationSchema)
        .properties!["serialNumber"],
    }],
    responses: {
      200: singleDeviceResponse,
    },
  },
});
