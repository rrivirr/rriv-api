import prisma from "../infra/prisma.ts";
import { DLQ_NAME, QUEUE_NAME, SCHEMA } from "../infra/pg-boss/constants.ts";

/** A sync older than this (and not yet `synced`) is considered stuck. */
const STUCK_MS = 15 * 60 * 1000;
/** A queued job older than this is considered a backlog. */
const BACKLOG_SECONDS = 10 * 60;

interface JobStateRow {
  state: string;
  count: number;
  oldest_seconds: number | null;
}

const queueStats = async (queue: string) => {
  try {
    const rows = await prisma.$queryRawUnsafe<JobStateRow[]>(
      `SELECT state,
              COUNT(*)::int AS count,
              EXTRACT(EPOCH FROM (now() - MIN(created_on)))::float AS oldest_seconds
       FROM ${SCHEMA}.job
       WHERE name = $1
       GROUP BY state`,
      queue,
    );

    const byState: Record<string, number> = {};
    let oldestQueuedSeconds: number | null = null;
    let total = 0;
    for (const row of rows) {
      byState[row.state] = row.count;
      total += row.count;
      if (
        (row.state === "created" || row.state === "retry") &&
        row.oldest_seconds != null
      ) {
        oldestQueuedSeconds = Math.max(
          oldestQueuedSeconds ?? 0,
          row.oldest_seconds,
        );
      }
    }

    return { available: true, byState, total, oldestQueuedSeconds };
  } catch {
    // Queue tables may not exist on a fresh environment.
    return {
      available: false,
      byState: {},
      total: 0,
      oldestQueuedSeconds: null,
    };
  }
};

const secondsSince = (date: Date | null | undefined): number | null =>
  date ? Math.max(0, Math.round((Date.now() - date.getTime()) / 1000)) : null;

/**
 * Operational snapshot for the admin view: authorization convergence plus
 * pg-boss queue/DLQ health. No Prometheus stack is deployed, so this is the
 * consumer of these numbers.
 */
export const getSystemMetrics = async () => {
  const now = Date.now();

  const [
    grouped,
    recentFailures,
    oldestFailed,
    oldestStuckPending,
    queue,
    dlq,
    unreadNotifications,
  ] = await Promise.all([
    prisma.authSync.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.authSync.findMany({
      where: { status: "failed" },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: {
        resourceType: true,
        resourceId: true,
        attempts: true,
        lastError: true,
        updatedAt: true,
      },
    }),
    prisma.authSync.findFirst({
      where: { status: "failed" },
      orderBy: { updatedAt: "asc" },
      select: { updatedAt: true },
    }),
    prisma.authSync.findFirst({
      where: { status: "pending", updatedAt: { lt: new Date(now - STUCK_MS) } },
      orderBy: { updatedAt: "asc" },
      select: { updatedAt: true },
    }),
    queueStats(QUEUE_NAME),
    queueStats(DLQ_NAME),
    prisma.notification.count({ where: { readAt: null } }),
  ]);

  const byStatus: Record<string, number> = { pending: 0, synced: 0, failed: 0 };
  for (const row of grouped) {
    byStatus[row.status] = row._count._all;
  }
  const total = byStatus.pending + byStatus.synced + byStatus.failed;

  const oldestFailedSeconds = secondsSince(oldestFailed?.updatedAt);
  const stuckPendingSeconds = secondsSince(oldestStuckPending?.updatedAt);
  const dlqDepth = dlq.total;
  const backlog = (queue.oldestQueuedSeconds ?? 0) > BACKLOG_SECONDS;

  const health = byStatus.failed > 0 || dlqDepth > 0
    ? "critical"
    : stuckPendingSeconds != null || backlog
    ? "degraded"
    : "ok";

  return {
    generatedAt: new Date().toISOString(),
    health,
    authSync: {
      byStatus,
      total,
      oldestFailedSeconds,
      stuckPendingSeconds,
      inSyncPercent: total === 0
        ? 100
        : Math.round((byStatus.synced / total) * 1000) / 10,
    },
    queue: {
      name: QUEUE_NAME,
      available: queue.available,
      total: queue.total,
      byState: queue.byState,
      oldestQueuedSeconds: queue.oldestQueuedSeconds,
    },
    dlq: {
      name: DLQ_NAME,
      available: dlq.available,
      depth: dlqDepth,
      byState: dlq.byState,
    },
    notifications: { unread: unreadNotifications },
    recentFailures,
  };
};
