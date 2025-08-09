import { generateSchema } from "@anatine/zod-openapi";
import { ParameterObject } from "npm:openapi3-ts@^4.4.0/oas31";
import {
  registerConfigSnapshotLibraryConfig,
  registerConfigSnapshotLibraryConfigById,
} from "./schema.ts";
import { swaggerBuilder } from "../index.ts";
import {
  configSnapshotLibraryConfigQuerySchema,
  createConfigSnapshotLibraryConfigSchema,
  createNewConfigSnapshotLibraryConfigVersionSchema,
} from "../../handler/config-snapshot/schema.ts";
import { idSchema } from "../../handler/generic/generic.schema.ts";

const basePath = "/configSnapshot/libraryConfig";
const tags = ["configSnapshot"];
const configSnapshotLibraryConfigRef =
  "#/components/schemas/ConfigSnapshotLibraryConfig";
const mediaTypeHeader = "application/json";
const singleConfigSnapshotLibraryConfigResponse = {
  content: {
    [mediaTypeHeader]: { schema: { $ref: configSnapshotLibraryConfigRef } },
  },
};
registerConfigSnapshotLibraryConfig();
registerConfigSnapshotLibraryConfigById();

const ConfigSnapshotLibraryConfigQuerySchema = generateSchema(
  configSnapshotLibraryConfigQuerySchema,
);
const ConfigSnapshotLibraryConfigQuerySchemaProperties =
  ConfigSnapshotLibraryConfigQuerySchema.properties;

swaggerBuilder.addPath(basePath, {
  get: {
    tags,
    summary: `Get list of published config snapshots`,
    parameters: [
      ...Object.keys(ConfigSnapshotLibraryConfigQuerySchemaProperties as object)
        .map((
          q: string,
        ) =>
          ({
            name: q,
            in: "query",
            schema: { ...ConfigSnapshotLibraryConfigQuerySchemaProperties![q] },
          }) as ParameterObject
        ),
    ],
    responses: {
      200: {
        content: {
          [mediaTypeHeader]: {
            schema: {
              type: "array",
              items: { $ref: configSnapshotLibraryConfigRef },
            },
          },
        },
      },
    },
  },
  post: {
    tags,
    summary: `Create a new config snapshot library config`,
    requestBody: {
      content: {
        [mediaTypeHeader]: {
          schema: generateSchema(createConfigSnapshotLibraryConfigSchema),
        },
      },
    },
    responses: {
      201: singleConfigSnapshotLibraryConfigResponse,
    },
  },
});

swaggerBuilder.addPath(`${basePath}/:id`, {
  parameters: [{
    name: "id",
    in: "path",
    schema: generateSchema(idSchema).properties!["id"],
  }],
  get: {
    tags,
    summary: "get a single config snapshot library config and its versions",
    responses: {
      200: {
        content: {
          [mediaTypeHeader]: {
            schema: {
              $ref: "#/components/schemas/ConfigSnapshotLibraryConfigById",
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
    schema: generateSchema(idSchema).properties!["id"],
  }],
  post: {
    tags,
    summary:
      `Publish a new version to an existing config snapshot library config`,
    requestBody: {
      content: {
        [mediaTypeHeader]: {
          schema: generateSchema(
            createNewConfigSnapshotLibraryConfigVersionSchema,
          ),
        },
      },
    },
    responses: {
      201: {},
    },
  },
});
