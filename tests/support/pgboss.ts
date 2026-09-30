/**
 * Starts the pg-boss singleton and creates the application queues exactly as
 * `src/server.ts` does. Idempotent within a process (the singleton is shared by
 * every test module).
 */
import pgBoss from "../../src/infra/pg-boss/pg-boss.ts";
import { DLQ_NAME, QUEUE_NAME } from "../../src/infra/pg-boss/constants.ts";
import { prisma } from "./db.ts";

let started: Promise<void> | null = null;

export const startPgBoss = (): Promise<void> => {
  started ??= (async () => {
    await pgBoss.start();
    await pgBoss.createQueue(DLQ_NAME, {
      policy: "standard",
      retryLimit: 0,
      retentionSeconds: 30 * 24 * 60 * 60,
    });
    await pgBoss.createQueue(QUEUE_NAME, {
      policy: "stately",
      retryLimit: 5,
      retryDelay: 15,
      retryBackoff: true,
      retryDelayMax: 60 * 60,
      deadLetter: DLQ_NAME,
    });
  })();
  return started;
};

export const queuedJobCount = async (singletonKey: string): Promise<number> => {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT count(*) FROM pgboss.job
    WHERE name = ${QUEUE_NAME} AND singleton_key = ${singletonKey}
  `;
  return Number(rows[0].count);
};

export const dlqJobCount = async (): Promise<number> => {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT count(*) FROM pgboss.job WHERE name = ${DLQ_NAME}
  `;
  return Number(rows[0].count);
};
