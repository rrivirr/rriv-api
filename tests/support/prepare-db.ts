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

// The PostGIS image's entrypoint installs the `postgis` extension into
// `public` on first boot. Prisma runs with search_path=rriv (from `?schema=`),
// so the init migration's `CREATE EXTENSION IF NOT EXISTS postgis` is a no-op
// and `geography` stays invisible. PostGIS is not relocatable, so drop the
// image's copy and recreate it in `rriv` (idempotent: a no-op once it is).
await client.query(`
  DO $$
  DECLARE extension_schema text;
  BEGIN
    SELECT n.nspname INTO extension_schema
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'postgis';

    IF extension_schema IS NULL THEN
      EXECUTE 'CREATE EXTENSION postgis SCHEMA rriv';
    ELSIF extension_schema <> 'rriv' THEN
      EXECUTE 'DROP EXTENSION postgis CASCADE';
      EXECUTE 'CREATE EXTENSION postgis SCHEMA rriv';
    END IF;
  END $$;
`);

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
