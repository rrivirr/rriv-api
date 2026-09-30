/**
 * Prepares the test database: ensures the application and pg-boss schemas
 * exist, then applies Prisma migrations. Run before the suite:
 *
 *   deno task test:prepare
 *
 * DATABASE_URL is inherited from `--env-file=.env.test` (and passed on to the
 * child `deno task prisma`, so the dev `.env` cannot win — dotenv never
 * overrides an already-set variable).
 */
import { Client } from "npm:pg";

const url = Deno.env.get("DATABASE_URL");
if (!url) {
  console.error("DATABASE_URL is not set (run with --env-file=.env.test)");
  Deno.exit(1);
}

const client = new Client({ connectionString: url });
await client.connect();
// The app schema is created by Prisma, but pg-boss runs with createSchema:false.
await client.query("CREATE SCHEMA IF NOT EXISTS rriv");
await client.query("CREATE SCHEMA IF NOT EXISTS pgboss");
await client.end();

const { code, stdout, stderr } = await new Deno.Command("deno", {
  args: ["task", "prisma", "migrate", "deploy"],
}).output();

if (code !== 0) {
  console.error(new TextDecoder().decode(stdout));
  console.error(new TextDecoder().decode(stderr));
  Deno.exit(code);
}

console.log("[test:prepare] database ready");
