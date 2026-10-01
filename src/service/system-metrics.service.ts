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

export const OUTSTANDING_JOB_STATES: ReadonlySet<string> = new Set([
  "created",
  "retry",
  "active",
]);

export const outstandingJobCount = (rows: JobStateRow[]): number =>
  rows.reduce(
    (total, row) =>
      OUTSTANDING_JOB_STATES.has(row.state) ? total + row.count : total,
    0,
  );

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
    for (const row of rows) {
      byState[row.state] = row.count;
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

    return {
      available: true,
      byState,
      total: outstandingJobCount(rows),
      oldestQueuedSeconds,
    };
  } catch {
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

export const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
};

export const healthReasons = (input: {
  failed: number;
  dlqDepth: number;
  stuckPendingSeconds: number | null;
  oldestQueuedSeconds: number | null;
}): string[] => {
  const reasons: string[] = [];
  if (input.failed > 0) {
    reasons.push(`${input.failed} resource(s) failed to sync`);
  }
  if (input.dlqDepth > 0) {
    reasons.push(`${input.dlqDepth} job(s) parked in the dead-letter queue`);
  }
  if (input.stuckPendingSeconds != null) {
    reasons.push(
      `a sync has been pending for ${
        formatDuration(
          input.stuckPendingSeconds,
        )
      }`,
    );
  }
  const oldestQueued = input.oldestQueuedSeconds;
  if (oldestQueued != null && oldestQueued > BACKLOG_SECONDS) {
    reasons.push(
      `the oldest queued job is ${formatDuration(oldestQueued)} old`,
    );
  }
  return reasons;
};

export const getSystemMetrics = async () => {
  const [
    grouped,
    recentFailures,
    oldestFailed,
    oldestPending,
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
      where: { status: "pending" },
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
  const oldestPendingSeconds = secondsSince(oldestPending?.updatedAt);
  const stuckPendingSeconds =
    oldestPendingSeconds != null && oldestPendingSeconds >= STUCK_MS / 1000
      ? oldestPendingSeconds
      : null;
  const dlqDepth = dlq.total;

  const reasons = healthReasons({
    failed: byStatus.failed,
    dlqDepth,
    stuckPendingSeconds,
    oldestQueuedSeconds: queue.oldestQueuedSeconds,
  });
  const health = byStatus.failed > 0 || dlqDepth > 0
    ? "critical"
    : reasons.length > 0
    ? "degraded"
    : "ok";

  return {
    generatedAt: new Date().toISOString(),
    health,
    healthReasons: reasons,
    authSync: {
      byStatus,
      total,
      oldestFailedSeconds,
      oldestPendingSeconds,
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
      oldestQueuedSeconds: dlq.oldestQueuedSeconds,
    },
    notifications: { unread: unreadNotifications },
    recentFailures,
  };
};
