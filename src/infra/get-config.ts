import dotenv from "dotenv";
import { z } from "zod";
import fs, { existsSync } from "node:fs";
import path from "node:path";
import { homedir } from "node:os";

const readSchema = z.strictObject({
  NODE_PORT: z.coerce.number().optional(),
  LOG_LEVEL: z
    .enum(["error", "warn", "info", "http", "verbose", "debug", "silly"])
    .optional(),
  KEYCLOAK_URL: z.string().url(),
  KEYCLOAK_REALM: z.string(),
  DATABASE_URL: z.string(),
  AUTH_SERVICE_URL: z.string().url(),
  KEYCLOAK_CLIENT_ID: z.string(),
  KEYCLOAK_CLIENT_SECRET: z.string(),
  KEYCLOAK_AUTH_CLIENT_ID: z.string(),
  KEYCLOAK_AUTH_CLIENT_SECRET: z.string(),
  CHIRPSTACK_API_URL: z.string(),
  CHIRPSTACK_API_KEY: z.string(),
});

const getConfigValues = () => {
  const KEYCLOAK_URL = Deno.env.get("KEYCLOAK_URL");
  const DATABASE_URL = Deno.env.get("DATABASE_URL");
  const KEYCLOAK_REALM = Deno.env.get("KEYCLOAK_REALM");
  const NODE_PORT = Deno.env.get("NODE_PORT");
  const LOG_LEVEL = Deno.env.get("LOG_LEVEL");
  const AUTH_SERVICE_URL = Deno.env.get("AUTH_SERVICE_URL");
  const KEYCLOAK_CLIENT_ID = Deno.env.get("KEYCLOAK_CLIENT_ID");
  const KEYCLOAK_CLIENT_SECRET = Deno.env.get("KEYCLOAK_CLIENT_SECRET");
  const KEYCLOAK_AUTH_CLIENT_ID = Deno.env.get("KEYCLOAK_AUTH_CLIENT_ID");
  const KEYCLOAK_AUTH_CLIENT_SECRET = Deno.env.get(
    "KEYCLOAK_AUTH_CLIENT_SECRET",
  );
  const CHIRPSTACK_API_URL = Deno.env.get("CHIRPSTACK_API_URL");
  const CHIRPSTACK_API_KEY = Deno.env.get("CHIRPSTACK_API_KEY");

  const envConfig = {
    ...(KEYCLOAK_REALM && { KEYCLOAK_REALM }),
    ...(DATABASE_URL && { DATABASE_URL }),
    ...(KEYCLOAK_URL && { KEYCLOAK_URL }),
    ...(NODE_PORT && { NODE_PORT }),
    ...(LOG_LEVEL && { LOG_LEVEL }),
    ...(AUTH_SERVICE_URL && { AUTH_SERVICE_URL }),
    ...(KEYCLOAK_CLIENT_ID && { KEYCLOAK_CLIENT_ID }),
    ...(KEYCLOAK_CLIENT_SECRET && { KEYCLOAK_CLIENT_SECRET }),
    ...(KEYCLOAK_AUTH_CLIENT_ID && { KEYCLOAK_AUTH_CLIENT_ID }),
    ...(KEYCLOAK_AUTH_CLIENT_SECRET && { KEYCLOAK_AUTH_CLIENT_SECRET }),
    ...(CHIRPSTACK_API_URL && { CHIRPSTACK_API_URL }),
    ...(CHIRPSTACK_API_KEY && { CHIRPSTACK_API_KEY }),
  };

  const dirPath = path.join(homedir(), ".auth-api");
  const localDirPath = `${path.join("./config")}`;
  const filePath = `${path.join(dirPath, "config")}`;
  const localFilePath = `${path.join(localDirPath, "config")}`;
  let fileContent;
  let localFileContent;

  if (existsSync(dirPath) && existsSync(filePath)) {
    fileContent = fs.readFileSync(filePath, "utf8");
  }
  if (existsSync(localDirPath) && existsSync(localFilePath)) {
    localFileContent = fs.readFileSync(localFilePath, "utf8");
  }

  const fileConfig = {
    ...(fileContent && dotenv.parse(fileContent)),
    ...(localFileContent && dotenv.parse(localFileContent)),
  };

  const config = readSchema.parse({ ...fileConfig, ...envConfig });

  return config;
};

const config = getConfigValues();
export default config;
