import { OpenApiBuilder } from "openapi3-ts/oas31";
import packageJson from "../../package.json" with { type: "json" };

export const swaggerBuilder = OpenApiBuilder.create()
  .addOpenApiVersion("3.1.0")
  .addInfo({
    title: "RRIV API",
    version: packageJson.version,
  })
  .addSecurityScheme("bearerAuth", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
  });
