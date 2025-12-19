import { generateSchema } from "@anatine/zod-openapi";
import { ParameterObject } from "npm:openapi3-ts@^4.4.0/oas31";
import { swaggerBuilder } from "../index.ts";
import {
  registerSensorConfigHistorySchema,
  registerSensorConfigSchema,
} from "./schema.ts";
import { createSensorConfigSchema } from "../../handler/sensor/schema.ts";
import { idSchema } from "../../handler/generic/generic.schema.ts";
import {
  configHistoryQuerySchema,
} from "../../handler/config-snapshot/schema.ts";

const basePath = "/sensor/config";
const historyPath = "/sensor/history";
const tags = ["sensor"];
const sensorConfigRef = "#/components/schemas/SensorConfig";
const mediaTypeHeader = "application/json";
const singleSensorConfigResponse = {
  content: { [mediaTypeHeader]: { schema: { $ref: sensorConfigRef } } },
};
registerSensorConfigSchema();
registerSensorConfigHistorySchema();

const ConfigHistoryQuerySchema = generateSchema(
  configHistoryQuerySchema,
);
const ConfigHistoryQuerySchemaProperties = ConfigHistoryQuerySchema.properties;

swaggerBuilder.addPath(basePath, {
  post: {
    tags,
    summary: `Create a new sensor config`,
    requestBody: {
      content: {
        [mediaTypeHeader]: {
          schema: generateSchema(createSensorConfigSchema),
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
    schema: generateSchema(idSchema).properties!["id"],
  }],
  delete: {
    tags,
    responses: {
      200: singleSensorConfigResponse,
    },
  },
});

swaggerBuilder.addPath(`${historyPath}`, {
  get: {
    tags,
    summary: `Get history of applied configurations`,
    parameters: [
      ...Object.keys(ConfigHistoryQuerySchemaProperties as object).map((
        q: string,
      ) =>
        ({
          name: q,
          in: "query",
          schema: { ...ConfigHistoryQuerySchemaProperties![q] },
        }) as ParameterObject
      ),
    ],
    responses: {
      200: {
        content: {
          [mediaTypeHeader]: {
            schema: {
              type: "array",
              items: {
                $ref: "#/components/schemas/SensorConfigHistory",
              },
            },
          },
        },
      },
    },
  },
});
