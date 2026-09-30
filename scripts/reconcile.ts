/**
 * Authorization reconciler, run by a Kubernetes CronJob:
 *
 *   deno run --allow-all scripts/reconcile.ts sweep   # every ~15 min
 *   deno run --allow-all scripts/reconcile.ts full    # nightly
 *
 * `sweep` re-queues resources whose `auth_sync` row has not reached `synced`
 * after the settle window. `full` re-queues every context and every account
 * with an active bind, catching drift from changes made outside the API.
 */
import prisma from "../src/infra/prisma.ts";
import logger from "../src/winston.ts";
import pgBoss from "../src/infra/pg-boss/pg-boss.ts";
import {
  type AuthResourceType,
  syncAuthorization,
} from "../src/service/authorization-sync.service.ts";

const STALE_MS = 15 * 60 * 1000;

export const sweep = async () => {
  const cutoff = new Date(Date.now() - STALE_MS);
  const stale = await prisma.authSync.findMany({
    where: { status: { not: "synced" }, updatedAt: { lt: cutoff } },
    select: { resourceType: true, resourceId: true },
  });

  for (const row of stale) {
    await syncAuthorization({
      type: row.resourceType as AuthResourceType,
      id: row.resourceId,
    });
  }

  logger.info(`[reconcile] sweep re-queued ${stale.length} stale sync(s)`);
};

export const full = async () => {
  const [contexts, accounts] = await Promise.all([
    prisma.context.findMany({ select: { id: true } }),
    prisma.bind.findMany({
      where: { unboundAt: null, archivedAt: null },
      select: { accountId: true },
      distinct: ["accountId"],
    }),
  ]);

  for (const context of contexts) {
    await syncAuthorization({ type: "context", id: context.id });
  }
  for (const account of accounts) {
    await syncAuthorization({ type: "account", id: account.accountId });
  }

  logger.info(
    `[reconcile] full re-queued ${contexts.length} context(s), ${accounts.length} account(s)`,
  );
};

export const main = async () => {
  const mode = Deno.args[0] ?? "sweep";

  await pgBoss.start();
  try {
    if (mode === "full") {
      await full();
    } else {
      await sweep();
    }
  } finally {
    await pgBoss.stop({ graceful: false });
    await prisma.$disconnect();
  }
};

if (import.meta.main) {
  await main();
}
