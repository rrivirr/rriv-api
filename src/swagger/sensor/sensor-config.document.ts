import { generateSchema } from "@anatine/zod-openapi";
import { ParameterObject } from "npm:openapi3-ts@^4.4.0/oas31";
import { swaggerBuilder } from "../index.ts";
import { registerSensorConfigSchema } from "./schema.ts";
import {
  createSensorConfigValidationSchema,
  sensorConfigQueryValidationSchema,
} from "../../handler/sensor/schema.ts";
import { idValidationSchema } from "../../handler/generic/generic.schema.ts";

const basePath = "/sensor/config";
const tags = ["sensor"];
const sensorConfigRef = "#/components/schemas/SensorConfig";
const mediaTypeHeader = "application/json";
const singleSensorConfigResponse = {
  content: { [mediaTypeHeader]: { schema: { $ref: sensorConfigRef } } },
};
registerSensorConfigSchema();

const SensorConfigQuerySchema = generateSchema(
  sensorConfigQueryValidationSchema,
);
const SensorConfigQuerySchemaProperties = SensorConfigQuerySchema.properties;

swaggerBuilder.addPath(basePath, {
  get: {
    tags,
    summary: `Get user's list of sensor configs`,
    parameters: [
      ...Object.keys(SensorConfigQuerySchemaProperties as object).map((
        q: string,
      ) =>
        ({
          name: q,
          in: "query",
          schema: { ...SensorConfigQuerySchemaProperties![q] },
        }) as ParameterObject
      ),
    ],
    responses: {
      200: {
        content: {
          [mediaTypeHeader]: {
            schema: { type: "array", items: { $ref: sensorConfigRef } },
          },
        },
      },
    },
  },
  post: {
    tags,
    summary: `Create a new sensor config`,
    requestBody: {
      content: {
        [mediaTypeHeader]: {
          schema: generateSchema(createSensorConfigValidationSchema),
        },
      },
    },
    responses: {
      201: singleSensorConfigResponse,
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
      200: singleSensorConfigResponse,
    },
  },
});
