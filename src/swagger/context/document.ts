import { generateSchema } from "@anatine/zod-openapi";
import { ParameterObject } from "npm:openapi3-ts@^4.4.0/oas31";
import {
  contextQueryValidationSchema,
  createContextValidationSchema,
  updateContextValidationSchema,
} from "../../handler/context/schema.ts";
import { idValidationSchema } from "../../handler/generic/generic.schema.ts";
import { registerContextSchema } from "./schema.ts";
import { swaggerBuilder } from "../index.ts";

export const basePath = "/context";
const tags = ["context"];
const contextRef = "#/components/schemas/Context";
const mediaTypeHeader = "application/json";
const singleContextResponse = {
  content: {
    [mediaTypeHeader]: {
      schema: { $ref: contextRef },
    },
  },
};
registerContextSchema();
const ContextQuerySchema = generateSchema(contextQueryValidationSchema);
const ContextQuerySchemaProperties = ContextQuerySchema.properties;

swaggerBuilder.addPath(basePath, {
  get: {
    tags,
    summary: `Get user's list of contexts`,
    parameters: [
      ...Object.keys(ContextQuerySchemaProperties as object).map((
        q: string,
      ) =>
        ({
          name: q,
          in: "query",
          schema: { ...ContextQuerySchemaProperties![q] },
        }) as ParameterObject
      ),
    ],
    responses: {
      200: {
        content: {
          [mediaTypeHeader]: {
            schema: { type: "array", items: { $ref: contextRef } },
          },
        },
      },
    },
  },
  post: {
    tags,
    summary: `Create a new context`,
    requestBody: {
      content: {
        [mediaTypeHeader]: {
          schema: generateSchema(createContextValidationSchema),
        },
      },
    },
    responses: {
      201: singleContextResponse,
    },
  },
});

swaggerBuilder.addPath(`${basePath}/:id`, {
  parameters: [{
    name: "id",
    in: "path",
    schema: generateSchema(idValidationSchema).properties!["id"],
  }],
  patch: {
    tags,
    summary: `Update an existing context`,
    requestBody: {
      content: {
        [mediaTypeHeader]: {
          schema: generateSchema(updateContextValidationSchema),
        },
      },
    },
    responses: {
      200: singleContextResponse,
    },
  },
  delete: {
    tags,
    responses: {
      200: singleContextResponse,
    },
  },
});
