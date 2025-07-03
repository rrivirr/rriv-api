import { generateSchema } from "@anatine/zod-openapi";
import { ParameterObject } from "npm:openapi3-ts@^4.4.0/oas31";
import {
  registerActiveConfigSnapshotSchema,
  registerConfigSnapshotHistorySchema,
  registerConfigSnapshotSchema,
} from "./schema.ts";
import { swaggerBuilder } from "../index.ts";
import {
  activeConfigQuerySchema,
  configSnapshotHistoryQuerySchema,
  configSnapshotQuerySchema,
  overwriteActiveConfigSnapshotSchema,
  saveConfigSnapshotSchema,
} from "../../handler/config-snapshot/schema.ts";

const basePath = "/configSnapshot";
const tags = ["configSnapshot"];
const mediaTypeHeader = "application/json";

registerActiveConfigSnapshotSchema();
registerConfigSnapshotHistorySchema();
registerConfigSnapshotSchema();

const ConfigSnapshotQuerySchema = generateSchema(
  configSnapshotQuerySchema,
);
const ConfigSnapshotQuerySchemaProperties =
  ConfigSnapshotQuerySchema.properties;

const ActiveConfigQuerySchema = generateSchema(
  activeConfigQuerySchema,
);
const ActiveConfigQuerySchemaProperties = ActiveConfigQuerySchema.properties;

const ConfigSnapshotHistoryQuerySchema = generateSchema(
  configSnapshotHistoryQuerySchema,
);
const ConfigSnapshotHistoryQuerySchemaProperties =
  ConfigSnapshotHistoryQuerySchema.properties;

swaggerBuilder.addPath(basePath, {
  get: {
    tags,
    summary: `Get list of saved config snapshots`,
    parameters: [
      ...Object.keys(ConfigSnapshotQuerySchemaProperties as object).map((
        q: string,
      ) =>
        ({
          name: q,
          in: "query",
          schema: { ...ConfigSnapshotQuerySchemaProperties![q] },
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
                $ref: "#/components/schemas/ConfigSnapshot",
              },
            },
          },
        },
      },
    },
  },
});

swaggerBuilder.addPath(`${basePath}/history`, {
  get: {
    tags,
    summary: `Get history of applied configurations`,
    parameters: [
      ...Object.keys(ConfigSnapshotHistoryQuerySchemaProperties as object).map((
        q: string,
      ) =>
        ({
          name: q,
          in: "query",
          schema: { ...ConfigSnapshotHistoryQuerySchemaProperties![q] },
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
                $ref: "#/components/schemas/ConfigSnapshotHistory",
              },
            },
          },
        },
      },
    },
  },
});

swaggerBuilder.addPath(`${basePath}/active`, {
  get: {
    tags,
    summary: `Get currently applied configurations`,
    parameters: [
      ...Object.keys(ActiveConfigQuerySchemaProperties as object).map((
        q: string,
      ) =>
        ({
          name: q,
          in: "query",
          schema: { ...ActiveConfigQuerySchemaProperties![q] },
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
                $ref: "#/components/schemas/ActiveConfigSnapshot",
              },
            },
          },
        },
      },
    },
  },
  put: {
    tags,
    summary: `completely overwrite the active config snapshot`,
    requestBody: {
      content: {
        [mediaTypeHeader]: {
          schema: generateSchema(overwriteActiveConfigSnapshotSchema),
        },
      },
    },
  },
});

swaggerBuilder.addPath(`${basePath}/save`, {
  post: {
    tags,
    summary: `save active config snapshot`,
    requestBody: {
      content: {
        [mediaTypeHeader]: {
          schema: generateSchema(saveConfigSnapshotSchema),
        },
      },
    },
  },
});
