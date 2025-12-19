import { generateSchema } from "@anatine/zod-openapi";
import { ParameterObject } from "npm:openapi3-ts@^4.4.0/oas31";
import { swaggerBuilder } from "../index.ts";
import {
  registerDataloggerConfigHistorySchema,
  registerDataloggerConfigSchema,
} from "./schema.ts";
import {
  createDataloggerConfigSchema,
} from "../../handler/datalogger/schema.ts";
import { idSchema } from "../../handler/generic/generic.schema.ts";
import {
  configHistoryQuerySchema,
} from "../../handler/config-snapshot/schema.ts";

const basePath = "/datalogger/config";
const historyPath = "/datalogger/history";
const tags = ["datalogger"];
const dataloggerConfigRef = "#/components/schemas/DataloggerConfig";
const mediaTypeHeader = "application/json";
const singleDataloggerConfigResponse = {
  content: { [mediaTypeHeader]: { schema: { $ref: dataloggerConfigRef } } },
};
registerDataloggerConfigSchema();
registerDataloggerConfigHistorySchema();

const ConfigHistoryQuerySchema = generateSchema(
  configHistoryQuerySchema,
);
const ConfigHistoryQuerySchemaProperties = ConfigHistoryQuerySchema.properties;

swaggerBuilder.addPath(basePath, {
  post: {
    tags,
    summary: `Create a new datalogger config`,
    requestBody: {
      content: {
        [mediaTypeHeader]: {
          schema: generateSchema(createDataloggerConfigSchema),
        },
      },
    },
    responses: {
      201: singleDataloggerConfigResponse,
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
      200: singleDataloggerConfigResponse,
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
                $ref: "#/components/schemas/DataloggerConfigHistory",
              },
            },
          },
        },
      },
    },
  },
});
