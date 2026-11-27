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
  configHistoryQuerySchema,
  configSnapshotQuerySchema,
  renameSavedSnapshotSchema,
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

const ConfigHistoryQuerySchema = generateSchema(
  configHistoryQuerySchema,
);
const ConfigHistoryQuerySchemaProperties = ConfigHistoryQuerySchema.properties;

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
              $ref: "#/components/schemas/ConfigSnapshotHistory",
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
              $ref: "#/components/schemas/ActiveConfigSnapshot",
            },
          },
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
    responses: {
      201: {
        description: "The saved snapshot",
        content: {
          [mediaTypeHeader]: {
            schema: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                name: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
});

swaggerBuilder.addPath(`${basePath}/{id}`, {
  parameters: [{
    name: "id",
    in: "path",
    required: true,
    schema: { type: "string", format: "uuid" },
  }],
  patch: {
    tags,
    summary: "rename one of your saved config snapshots",
    requestBody: {
      content: {
        [mediaTypeHeader]: {
          schema: generateSchema(renameSavedSnapshotSchema),
        },
      },
    },
    responses: {
      200: { description: "The snapshot's id and new name" },
      404: { description: "Not one of your saved snapshots" },
      409: { description: "You already have a saved snapshot with that name" },
    },
  },
  delete: {
    tags,
    summary: "delete (archive) one of your saved config snapshots",
    responses: {
      204: { description: "Archived" },
      404: { description: "Not one of your saved snapshots" },
    },
  },
});
