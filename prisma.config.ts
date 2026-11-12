import "dotenv/config";
import { defineConfig } from "prisma/config";
import {
  readConfigFiles,
  writeDatabaseCaCert,
} from "./src/infra/config-files.ts";

const fileConfig = readConfigFiles();
const env = (key: string) => Deno.env.get(key) ?? fileConfig[key];

const caCert = env("DATABASE_CA_CRT");
if (caCert) writeDatabaseCaCert(caCert);

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
