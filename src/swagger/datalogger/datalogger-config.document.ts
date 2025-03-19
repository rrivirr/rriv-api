import { generateSchema } from "@anatine/zod-openapi";
import { swaggerBuilder } from "../index.ts";
import { registerDataloggerConfigSchema } from "./schema.ts";
import {
  createDataloggerConfigValidationSchema,
} from "../../handler/datalogger/schema.ts";
import { idValidationSchema } from "../../handler/generic/generic.schema.ts";

const basePath = "/datalogger/config";
const tags = ["datalogger"];
const dataloggerConfigRef = "#/components/schemas/DataloggerConfig";
const mediaTypeHeader = "application/json";
const singleDataloggerConfigResponse = {
  content: { [mediaTypeHeader]: { schema: { $ref: dataloggerConfigRef } } },
};
registerDataloggerConfigSchema();

swaggerBuilder.addPath(basePath, {
  post: {
    tags,
    summary: `Create a new datalogger config`,
    requestBody: {
      content: {
        [mediaTypeHeader]: {
          schema: generateSchema(createDataloggerConfigValidationSchema),
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
    schema: generateSchema(idValidationSchema).properties!["id"],
  }],
  delete: {
    tags,
    responses: {
      200: singleDataloggerConfigResponse,
    },
  },
});
