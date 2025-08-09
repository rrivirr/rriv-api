import { generateSchema } from "@anatine/zod-openapi";
import { ParameterObject } from "npm:openapi3-ts@^4.4.0/oas31";
import { registerDataloggerDriverSchema } from "./schema.ts";
import { swaggerBuilder } from "../index.ts";
import {
  createDataloggerDriverSchema,
  dataloggerDriverQuerySchema,
} from "../../handler/datalogger/schema.ts";
import { idSchema } from "../../handler/generic/generic.schema.ts";

const basePath = "/datalogger/driver";
const tags = ["datalogger"];
const dataloggerDriverRef = "#/components/schemas/DataloggerDriver";
const mediaTypeHeader = "application/json";
const singleDataloggerDriverResponse = {
  content: { [mediaTypeHeader]: { schema: { $ref: dataloggerDriverRef } } },
};
registerDataloggerDriverSchema();

const DataloggerDriverQuerySchema = generateSchema(
  dataloggerDriverQuerySchema,
);
const DataloggerDriverQuerySchemaProperties =
  DataloggerDriverQuerySchema.properties;

swaggerBuilder.addPath(basePath, {
  get: {
    tags,
    summary: `Get list of available datalogger drivers`,
    parameters: [
      ...Object.keys(DataloggerDriverQuerySchemaProperties as object).map((
        q: string,
      ) =>
        ({
          name: q,
          in: "query",
          schema: { ...DataloggerDriverQuerySchemaProperties![q] },
        }) as ParameterObject
      ),
    ],
    responses: {
      200: {
        content: {
          [mediaTypeHeader]: {
            schema: { type: "array", items: { $ref: dataloggerDriverRef } },
          },
        },
      },
    },
  },
  post: {
    tags,
    summary: `Create a new datalogger driver`,
    requestBody: {
      content: {
        [mediaTypeHeader]: {
          schema: generateSchema(createDataloggerDriverSchema),
        },
      },
    },
    responses: {
      201: singleDataloggerDriverResponse,
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
      200: singleDataloggerDriverResponse,
    },
  },
});
