import { generateSchema } from "@anatine/zod-openapi";
import { ParameterObject } from "npm:openapi3-ts@^4.4.0/oas31";
import {
  registerSensorLibraryConfig,
  registerSensorLibraryConfigById,
} from "./schema.ts";
import { swaggerBuilder } from "../index.ts";
import {
  createNewSensorLibraryConfigVersionValidationSchema,
  createSensorLibraryConfigValidationSchema,
  sensorLibraryConfigQueryValidationSchema,
} from "../../handler/sensor/schema.ts";
import { idValidationSchema } from "../../handler/generic/generic.schema.ts";

const basePath = "/sensor/libraryConfig";
const tags = ["sensor"];
const sensorLibraryConfigRef = "#/components/schemas/SensorLibraryConfig";
const mediaTypeHeader = "application/json";
const singleSensorLibraryConfigResponse = {
  content: { [mediaTypeHeader]: { schema: { $ref: sensorLibraryConfigRef } } },
};
registerSensorLibraryConfig();
registerSensorLibraryConfigById();

const SensorLibraryConfigQuerySchema = generateSchema(
  sensorLibraryConfigQueryValidationSchema,
);
const SensorLibraryConfigQuerySchemaProperties =
  SensorLibraryConfigQuerySchema.properties;

swaggerBuilder.addPath(basePath, {
  get: {
    tags,
    summary: `Get list of published sensor configs`,
    parameters: [
      ...Object.keys(SensorLibraryConfigQuerySchemaProperties as object).map((
        q: string,
      ) =>
        ({
          name: q,
          in: "query",
          schema: { ...SensorLibraryConfigQuerySchemaProperties![q] },
        }) as ParameterObject
      ),
    ],
    responses: {
      200: {
        content: {
          [mediaTypeHeader]: {
            schema: {
              type: "array",
              items: { $ref: sensorLibraryConfigRef },
            },
          },
        },
      },
    },
  },
  post: {
    tags,
    summary: `Create a new sensor library config`,
    requestBody: {
      content: {
        [mediaTypeHeader]: {
          schema: generateSchema(createSensorLibraryConfigValidationSchema),
        },
      },
    },
    responses: {
      201: singleSensorLibraryConfigResponse,
    },
  },
});

swaggerBuilder.addPath(`${basePath}/:id`, {
  parameters: [{
    name: "id",
    in: "path",
    schema: generateSchema(idValidationSchema).properties!["id"],
  }],
  delete: {
    tags,
    responses: {
      200: singleSensorLibraryConfigResponse,
    },
  },
  get: {
    tags,
    summary: "get a single sensor library config and its versions",
    responses: {
      200: {
        content: {
          [mediaTypeHeader]: {
            schema: { $ref: "#/components/schemas/SensorLibraryConfigById" },
          },
        },
      },
    },
  },
});

swaggerBuilder.addPath(`${basePath}/:id/version`, {
  parameters: [{
    name: "id",
    in: "path",
    schema: generateSchema(idValidationSchema).properties!["id"],
  }],
  post: {
    tags,
    summary: `Publish a new version to an existing sensor library config`,
    requestBody: {
      content: {
        [mediaTypeHeader]: {
          schema: generateSchema(
            createNewSensorLibraryConfigVersionValidationSchema,
          ),
        },
      },
    },
    responses: {
      201: {},
    },
  },
});
