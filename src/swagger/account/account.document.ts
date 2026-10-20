import { generateSchema } from "@anatine/zod-openapi";
import { swaggerBuilder } from "../index.ts";
import {
  createAccountSchema,
  emailSchema,
} from "../../handler/account/schema.ts";

const basePath = "/account";
const tags = ["account"];
const mediaTypeHeader = "application/json";

swaggerBuilder.addPath(basePath, {
  post: {
    tags,
    summary: `create a new account`,
    requestBody: {
      content: {
        [mediaTypeHeader]: {
          schema: generateSchema(createAccountSchema),
        },
      },
    },
    responses: { 201: {} },
  },
});

swaggerBuilder.addPath(`${basePath}/me`, {
  get: {
    tags,
    summary: `the signed-in account and its system roles`,
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        content: {
          [mediaTypeHeader]: {
            schema: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                email: { type: "string" },
                firstName: { type: "string" },
                lastName: { type: "string" },
                isAdmin: { type: "boolean" },
                isProvisioner: {
                  type: "boolean",
                  description: "Can provision devices (true for admins).",
                },
              },
            },
          },
        },
      },
    },
  },
});

swaggerBuilder.addPath(`${basePath}/verifyEmail`, {
  post: {
    tags,
    requestBody: {
      content: {
        [mediaTypeHeader]: {
          schema: generateSchema(emailSchema),
        },
      },
    },
    responses: { 204: {} },
  },
});

swaggerBuilder.addPath(`${basePath}/resetPassword`, {
  post: {
    tags,
    requestBody: {
      content: {
        [mediaTypeHeader]: {
          schema: generateSchema(emailSchema),
        },
      },
    },
    responses: { 204: {} },
  },
});
