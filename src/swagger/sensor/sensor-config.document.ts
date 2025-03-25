import { generateSchema } from "@anatine/zod-openapi";
import { swaggerBuilder } from "../index.ts";
import { registerSensorConfigSchema } from "./schema.ts";
import { createSensorConfigSchema } from "../../handler/sensor/schema.ts";
import { idSchema } from "../../handler/generic/generic.schema.ts";

const basePath = "/sensor/config";
const tags = ["sensor"];
const sensorConfigRef = "#/components/schemas/SensorConfig";
const mediaTypeHeader = "application/json";
const singleSensorConfigResponse = {
  content: { [mediaTypeHeader]: { schema: { $ref: sensorConfigRef } } },
};
registerSensorConfigSchema();

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
