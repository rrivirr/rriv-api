import pgBoss from "../../src/infra/pg-boss/pg-boss.ts";
import { DLQ_NAME, QUEUE_NAME } from "../../src/infra/pg-boss/constants.ts";
import { recreateQueues } from "../../src/infra/pg-boss/queues.ts";
import { prisma } from "./db.ts";

let started: Promise<void> | null = null;

export const startPgBoss = (): Promise<void> => {
  started ??= (async () => {
    await pgBoss.start();
    await recreateQueues(pgBoss);
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
