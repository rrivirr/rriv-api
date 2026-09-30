import { fromPrisma } from "npm:pg-boss";
import { AxiosError } from "axios";
import { Prisma } from "generated/browser.ts";
import prisma from "../infra/prisma.ts";
import authServiceAxios from "../infra/axios/auth-service.ts";
import { getM2MToken } from "../infra/keycloak/keycloak.ts";
import { sendMessage } from "../infra/pg-boss/pg-boss.ts";
import { QUEUE_NAME, TYPES } from "../infra/pg-boss/constants.ts";
import { AuthResourceType } from "../infra/pg-boss/types.ts";
import { Tuple } from "../types/auth-service.types.ts";
import { HttpException } from "../utils/http-exception.ts";
import { serializeError } from "../utils/log-error.ts";
import { readResource, SYSTEM } from "./auth.service.ts";
import { createNotification } from "./notification.service.ts";

export type { AuthResourceType };
export type AuthResource = { type: AuthResourceType; id: string };

const tupleKey = (tuple: Tuple) =>
  `${tuple.user}|${tuple.relation}|${tuple.object}`;

/**
 * Records the intent to converge a resource's authorization state and enqueues
 * the sync job. When `trx` is provided the intent row and the job are written in
 * the caller's transaction, so the outbox is atomic with the domain change.
 */
export const syncAuthorization = async (
  resource: AuthResource,
  trx?: Prisma.TransactionClient,
) => {
  const db = trx ?? prisma;

  const row = await db.authSync.upsert({
    where: {
      resourceType_resourceId: {
        resourceType: resource.type,
        resourceId: resource.id,
      },
    },
    create: {
      resourceType: resource.type,
      resourceId: resource.id,
      status: "pending",
    },
    update: {
      status: "pending",
      version: { increment: 1 },
    },
    select: { version: true },
  });

  await sendMessage(
    QUEUE_NAME,
    {
      type: TYPES.AUTH_SYNC,
      payload: {
        resourceType: resource.type,
        resourceId: resource.id,
        version: row.version,
      },
    },
    {
      singletonKey: `${resource.type}:${resource.id}`,
      ...(trx && { db: fromPrisma(trx) }),
    },
  );
};

/** Derives the desired tuple set for a resource straight from the database. */
export const desiredTuples = async (
  resource: AuthResource,
): Promise<Tuple[]> => {
  switch (resource.type) {
    case "context": {
      const context = await prisma.context.findUnique({
        where: { id: resource.id },
        // The client omits these globally; this query needs them.
        omit: { accountId: false, archivedAt: false },
        include: { ContextShare: true, DeviceContext: true },
      });

      // Ended or archived (or deleted) contexts grant nothing.
      if (!context || context.endedAt || context.archivedAt) {
        return [];
      }

      return [
        {
          user: SYSTEM,
          object: `context:${context.id}`,
          relation: "system",
        },
        {
          user: `user:${context.accountId}`,
          object: `context:${context.id}`,
          relation: "owner",
        },
        ...context.ContextShare.map((share) => ({
          user: `user:${share.accountId}`,
          object: `context:${context.id}`,
          relation: share.relation,
        })),
        ...context.DeviceContext.filter(
          (deviceContext) =>
            !deviceContext.endedAt && !deviceContext.archivedAt,
        ).map((deviceContext) => ({
          user: `context:${context.id}`,
          object: `device:${deviceContext.deviceId}`,
          relation: "context",
        })),
      ];
    }
    case "account": {
      const [devices, binds] = await Promise.all([
        // `omit` can't be combined with `select`; take the whole row.
        prisma.device.findMany({
          where: { provisionedBy: resource.id },
          omit: { archivedAt: false },
        }),
        prisma.bind.findMany({
          where: {
            accountId: resource.id,
            unboundAt: null,
            archivedAt: null,
          },
          select: { deviceId: true },
        }),
      ]);

      return [
        ...devices
          .filter((device) => !device.archivedAt)
          .map((device) => ({
            user: SYSTEM,
            object: `device:${device.id}`,
            relation: "system",
          })),
        ...binds.map((bind) => ({
          user: `user:${resource.id}`,
          object: `device:${bind.deviceId}`,
          relation: "owner",
        })),
      ];
    }
    default:
      throw new HttpException(
        500,
        `unsupported auth resource type: ${resource.type}`,
      );
  }
};

/**
 * Converges OpenFGA to the resource's desired state. Read-modify-write of the
 * diff, so it is idempotent and independent of job ordering.
 */
export const applyAuthorizationSync = async (resource: AuthResource) => {
  const desired = await desiredTuples(resource);
  // This runs in the pg-boss worker
  const token = await getM2MToken(true);
  const current = await readResource(
    { type: resource.type, id: resource.id },
    token,
  );

  const currentByKey = new Map(
    current.map((tuple) => [tupleKey(tuple), tuple]),
  );
  const desiredByKey = new Map(
    desired.map((tuple) => [tupleKey(tuple), tuple]),
  );

  const writes = desired.filter((tuple) => !currentByKey.has(tupleKey(tuple)));
  const deletes = current.filter((tuple) => !desiredByKey.has(tupleKey(tuple)));

  if (writes.length || deletes.length) {
    await authServiceAxios.post(
      "/relationship",
      { writes, deletes },
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }

  await prisma.authSync.update({
    where: {
      resourceType_resourceId: {
        resourceType: resource.type,
        resourceId: resource.id,
      },
    },
    data: {
      status: "synced",
      attempts: { increment: 1 },
      lastError: Prisma.DbNull,
    },
  });

  return { writes: writes.length, deletes: deletes.length };
};

/**
 * A 4xx (other than 408/429) is deterministic — retrying only burns attempts.
 * These get parked in the DLQ instead of being retried.
 */
export const isPermanentAuthError = (error: unknown): boolean => {
  if (error instanceof AxiosError) {
    const status = error.response?.status;
    return (
      status !== undefined &&
      status >= 400 &&
      status < 500 &&
      status !== 408 &&
      status !== 429
    );
  }
  return false;
};

/** Lists sync states (for the admin view). */
export const listAuthSyncs = async (filters: {
  status?: string;
  resourceType?: AuthResourceType;
  limit: number;
  offset: number;
}) => {
  const where = {
    ...(filters.status && { status: filters.status }),
    ...(filters.resourceType && { resourceType: filters.resourceType }),
  };

  const [items, total] = await Promise.all([
    prisma.authSync.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: filters.limit,
      skip: filters.offset,
    }),
    prisma.authSync.count({ where }),
  ]);

  return { items, total };
};

/** Re-queues a single resource's sync (admin, or owner via the context route). */
export const resync = async (resource: AuthResource) => {
  await syncAuthorization(resource);
};

/** Re-queues every failed resource. */
export const resyncAllFailed = async () => {
  const failed = await prisma.authSync.findMany({
    where: { status: "failed" },
    select: { resourceType: true, resourceId: true },
  });

  for (const row of failed) {
    await syncAuthorization({
      type: row.resourceType as AuthResourceType,
      id: row.resourceId,
    });
  }

  return { count: failed.length };
};

const resourceOwnerAccountId = async (
  resource: AuthResource,
): Promise<string | null> => {
  if (resource.type === "account") {
    return resource.id;
  }
  const context = await prisma.context.findUnique({
    where: { id: resource.id },
    omit: { accountId: false },
  });
  return context?.accountId ?? null;
};

/** In-app notice to the resource owner when a sync fails permanently. */
export const notifySyncFailure = async (
  resource: AuthResource,
  error: unknown,
) => {
  // Don't spam the owner: at most one notice per resource per day.
  const REFRESH_MS = 24 * 60 * 60 * 1000;
  const sync = await prisma.authSync.findUnique({
    where: {
      resourceType_resourceId: {
        resourceType: resource.type,
        resourceId: resource.id,
      },
    },
    select: { notifiedAt: true },
  });
  if (sync?.notifiedAt && Date.now() - sync.notifiedAt.getTime() < REFRESH_MS) {
    return;
  }

  const accountId = await resourceOwnerAccountId(resource);
  if (!accountId) {
    return;
  }

  const detail = error instanceof Error ? error.message : undefined;
  await createNotification({
    accountId,
    type: "AUTH_SYNC_FAILED",
    title: "Permissions failed to sync",
    body: detail
      ? `Could not update access for ${resource.type} ${resource.id}: ${detail}`
      : `Could not update access for ${resource.type} ${resource.id}.`,
    resourceType: resource.type,
    resourceId: resource.id,
  });

  await prisma.authSync.update({
    where: {
      resourceType_resourceId: {
        resourceType: resource.type,
        resourceId: resource.id,
      },
    },
    data: { notifiedAt: new Date() },
  });
};

/** Records a failed sync attempt so the failure is visible and reconcilable. */
export const recordSyncFailure = async (
  resource: AuthResource,
  error: unknown,
) => {
  try {
    await prisma.authSync.update({
      where: {
        resourceType_resourceId: {
          resourceType: resource.type,
          resourceId: resource.id,
        },
      },
      data: {
        status: "failed",
        attempts: { increment: 1 },
        lastError: serializeError(error) as Prisma.InputJsonValue,
      },
    });
  } catch {
    // Never let bookkeeping mask the original failure.
  }
};
