import { generateSchema } from "@anatine/zod-openapi";
import { ParameterObject } from "npm:openapi3-ts@^4.4.0/oas31";
import {
  registerDataloggerLibraryConfig,
  registerDataloggerLibraryConfigById,
} from "./schema.ts";
import { swaggerBuilder } from "../index.ts";
import {
  createDataloggerLibraryConfigValidationSchema,
  createNewDataloggerLibraryConfigVersionValidationSchema,
  dataloggerLibraryConfigQueryValidationSchema,
} from "../../handler/datalogger/schema.ts";
import { idValidationSchema } from "../../handler/generic/generic.schema.ts";

const basePath = "/datalogger/libraryConfig";
const tags = ["datalogger"];
const dataloggerLibraryConfigRef =
  "#/components/schemas/DataloggerLibraryConfig";
const mediaTypeHeader = "application/json";
const singleDataloggerLibraryConfigResponse = {
  content: {
    [mediaTypeHeader]: { schema: { $ref: dataloggerLibraryConfigRef } },
  },
};
registerDataloggerLibraryConfig();
registerDataloggerLibraryConfigById();

const DataloggerLibraryConfigQuerySchema = generateSchema(
  dataloggerLibraryConfigQueryValidationSchema,
);
const DataloggerLibraryConfigQuerySchemaProperties =
  DataloggerLibraryConfigQuerySchema.properties;

swaggerBuilder.addPath(basePath, {
  get: {
    tags,
    summary: `Get list of published datalogger configs`,
    parameters: [
      ...Object.keys(DataloggerLibraryConfigQuerySchemaProperties as object)
        .map((
          q: string,
        ) =>
          ({
            name: q,
            in: "query",
            schema: { ...DataloggerLibraryConfigQuerySchemaProperties![q] },
          }) as ParameterObject
        ),
    ],
    responses: {
      200: {
        content: {
          [mediaTypeHeader]: {
            schema: {
              type: "array",
              items: { $ref: dataloggerLibraryConfigRef },
            },
          },
        },
      },
    },
  },
  post: {
    tags,
    summary: `Create a new datalogger library config`,
    requestBody: {
      content: {
        [mediaTypeHeader]: {
          schema: generateSchema(createDataloggerLibraryConfigValidationSchema),
        },
      },
    },
    responses: {
      201: singleDataloggerLibraryConfigResponse,
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
      200: singleDataloggerLibraryConfigResponse,
    },
  },
  get: {
    tags,
    summary: "get a single datalogger library config and its versions",
    responses: {
      200: {
        content: {
          [mediaTypeHeader]: {
            schema: {
              $ref: "#/components/schemas/DataloggerLibraryConfigById",
            },
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
    summary: `Publish a new version to an existing datalogger library config`,
    requestBody: {
      content: {
        [mediaTypeHeader]: {
          schema: generateSchema(
            createNewDataloggerLibraryConfigVersionValidationSchema,
          ),
        },
      },
    },
    responses: {
      201: {},
    },
  },
});
