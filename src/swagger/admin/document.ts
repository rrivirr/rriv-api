import { generateSchema } from "@anatine/zod-openapi";
import { swaggerBuilder } from "../index.ts";
import {
  grantRoleSchema,
  systemRoleSchema,
} from "../../handler/admin/schema.ts";

export const basePath = "/admin/roles";
const tags = ["admin"];
const mediaTypeHeader = "application/json";
const security = [{ bearerAuth: [] }];
const forbidden = { 403: { description: "The caller isn't an admin." } };

const account = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    email: { type: "string" },
    firstName: { type: "string" },
    lastName: { type: "string" },
  },
} as const;

swaggerBuilder.addPath(basePath, {
  get: {
    tags,
    summary: `accounts holding a system role (admin or provisioner)`,
    description:
      "Lists direct grants only: admins are provisioners through the authorization model but are listed as admins.",
    security,
    responses: {
      200: {
        content: {
          [mediaTypeHeader]: {
            schema: {
              type: "array",
              items: {
                ...account,
                properties: {
                  ...account.properties,
                  roles: {
                    type: "array",
                    items: generateSchema(systemRoleSchema),
                  },
                },
              },
            },
          },
        },
      },
      ...forbidden,
    },
  },
  post: {
    tags,
    summary: `grant a system role by email`,
    description: "The account is notified of the grant.",
    security,
    requestBody: {
      content: {
        [mediaTypeHeader]: { schema: generateSchema(grantRoleSchema) },
      },
    },
    responses: {
      201: {
        description: "Granted.",
        content: { [mediaTypeHeader]: { schema: account } },
      },
      200: {
        description: "The account already held the role.",
        content: { [mediaTypeHeader]: { schema: account } },
      },
      404: { description: "No account with that email." },
      422: { description: "Invalid email or unknown role." },
      ...forbidden,
    },
  },
});

swaggerBuilder.addPath(`${basePath}/{role}/{id}`, {
  delete: {
    tags,
    summary: `revoke a system role`,
    security,
    parameters: [
      {
        name: "role",
        in: "path",
        required: true,
        schema: generateSchema(systemRoleSchema),
      },
      {
        name: "id",
        in: "path",
        required: true,
        schema: { type: "string", format: "uuid" },
      },
    ],
    responses: {
      204: { description: "Revoked (also when the account didn't hold it)." },
      409: { description: "Would remove the last admin." },
      ...forbidden,
    },
  },
});
