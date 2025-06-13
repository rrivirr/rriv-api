import { generateSchema } from "@anatine/zod-openapi";
import {
  createDeviceContextSchema,
  deviceContextParamsSchema,
  updateDeviceContextSchema,
} from "../../handler/device-context/schema.ts";
import { swaggerBuilder } from "../index.ts";
import { registerDeviceContextSchema } from "./schema.ts";

export const path = "/context/:contextId/device/:deviceId";
registerDeviceContextSchema();
const tags = ["context"];
const mediaTypeHeader = "application/json";

swaggerBuilder.addPath(path, {
  parameters: [{
    name: "contextId",
    in: "path",
    schema: generateSchema(deviceContextParamsSchema)
      .properties!["contextId"],
  }, {
    name: "deviceId",
    in: "path",
    schema: generateSchema(deviceContextParamsSchema)
      .properties!["deviceId"],
  }],
  post: {
    tags,
    summary: `add a device to a context`,
    requestBody: {
      content: {
        [mediaTypeHeader]: {
          schema: generateSchema(createDeviceContextSchema),
        },
      },
    },
    responses: {
      201: {},
    },
  },
  patch: {
    tags,
    summary: `update the details of a device in a context`,
    requestBody: {
      content: {
        [mediaTypeHeader]: {
          schema: generateSchema(updateDeviceContextSchema),
        },
      },
    },
    responses: {
      200: {},
    },
  },
  delete: {
    tags,
    responses: {
      200: {},
    },
  },
  get: {
    tags,
    responses: {
      200: {
        content: {
          [mediaTypeHeader]: {
            schema: { $ref: "#/components/schemas/DeviceContext" },
          },
        },
      },
    },
  },
});
