import prisma from "../../src/infra/prisma.ts";

export { prisma };

/**
 * Truncates every application table (and clears queued jobs) so each test
 * starts from a clean slate. Safe to call before each test.
 */
export const resetDb = async (): Promise<void> => {
  await prisma.$executeRawUnsafe(`
    DO $$
    DECLARE r record;
    BEGIN
      FOR r IN
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'rriv' AND tablename <> '_prisma_migrations'
      LOOP
        EXECUTE format('TRUNCATE TABLE rriv.%I CASCADE', r.tablename);
      END LOOP;
    END $$;
  `);
  await prisma
    .$executeRawUnsafe(`DELETE FROM pgboss.job WHERE name = 'rriv'`)
    .catch(() => {/* pgboss not initialised in this run */});
};
