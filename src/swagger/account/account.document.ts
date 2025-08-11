import { generateSchema } from "@anatine/zod-openapi";
import { swaggerBuilder } from "../index.ts";
import { createAccountSchema } from "../../handler/account/schema.ts";

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
    responses: {
      201: {},
    },
  },
});
