import { generateSchema } from "@anatine/zod-openapi";
import { ParameterObject } from "npm:openapi3-ts@^4.4.0/oas31";
import { registerSensorDriverSchema } from "./schema.ts";
import { swaggerBuilder } from "../index.ts";
import {
  createSensorDriverSchema,
  sensorDriverQuerySchema,
} from "../../handler/sensor/schema.ts";
import { idSchema } from "../../handler/generic/generic.schema.ts";

const basePath = "/sensor/driver";
const tags = ["sensor"];
const sensorDriverRef = "#/components/schemas/SensorDriver";
const mediaTypeHeader = "application/json";
const singleSensorDriverResponse = {
  content: { [mediaTypeHeader]: { schema: { $ref: sensorDriverRef } } },
};
registerSensorDriverSchema();

const SensorDriverQuerySchema = generateSchema(
  sensorDriverQuerySchema,
);
const SensorDriverQuerySchemaProperties = SensorDriverQuerySchema.properties;

swaggerBuilder.addPath(basePath, {
  get: {
    tags,
    summary: `Get list of available sensor drivers`,
    parameters: [
      ...Object.keys(SensorDriverQuerySchemaProperties as object).map((
        q: string,
      ) =>
        ({
          name: q,
          in: "query",
          schema: { ...SensorDriverQuerySchemaProperties![q] },
        }) as ParameterObject
      ),
    ],
    responses: {
      200: {
        content: {
          [mediaTypeHeader]: {
            schema: { type: "array", items: { $ref: sensorDriverRef } },
          },
        },
      },
    },
  },
  post: {
    tags,
    summary: `Create a new sensor driver`,
    requestBody: {
      content: {
        [mediaTypeHeader]: {
          schema: generateSchema(createSensorDriverSchema),
        },
      },
    },
    responses: {
      201: singleSensorDriverResponse,
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
      200: singleSensorDriverResponse,
    },
  },
});
