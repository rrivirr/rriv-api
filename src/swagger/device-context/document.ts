import { generateSchema } from "@anatine/zod-openapi";
import {
  createDeviceContextValidationSchema,
  deviceContextParamsValidationSchema,
  updateDeviceContextValidationSchema,
} from "../../handler/device-context/schema.ts";
import { swaggerBuilder } from "../index.ts";

export const path = "/context/:contextId/device/:deviceId";

const tags = ["context"];
const mediaTypeHeader = "application/json";

swaggerBuilder.addPath(path, {
  parameters: [{
    name: "contextId",
    in: "path",
    schema: generateSchema(deviceContextParamsValidationSchema)
      .properties!["contextId"],
  }, {
    name: "deviceId",
    in: "path",
    schema: generateSchema(deviceContextParamsValidationSchema)
      .properties!["deviceId"],
  }],
  post: {
    tags,
    summary: `add a device to a context`,
    requestBody: {
      content: {
        [mediaTypeHeader]: {
          schema: generateSchema(createDeviceContextValidationSchema),
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
          schema: generateSchema(updateDeviceContextValidationSchema),
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
});
