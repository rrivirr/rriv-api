import {
  CreateContextDto,
  QueryContextDto,
  UniqueContextDto,
  UpdateContextDto,
} from "../types/context.types.ts";
import * as contextRepositoy from "../repository/context.repository.ts";
import { HttpException } from "../utils/http-exception.ts";
import { authorizationCheck, listObjects, listUsers } from "./auth.service.ts";
import { getAccountByEmail, getAccountsByIds } from "./account.service.ts";
import { syncAuthorization } from "./authorization-sync.service.ts";
import { isUniqueConstraintError } from "../utils/prisma-errors.ts";
import prisma from "../infra/prisma.ts";

const getContextById = async (requestBody: UniqueContextDto) => {
  const { contextId } = requestBody;

  const context = await contextRepositoy.getContextById(contextId);
  if (!context) {
    throw new HttpException(
      404,
      `related context not found context:${contextId}`,
    );
  }
  return context;
};

export const authContextCheck = async (
  requestBody: UniqueContextDto & {
    relation: "owner" | "can_edit";
  },
) => {
  const { contextId, accountId, relation } = requestBody;

  await authorizationCheck({
    object: `context:${contextId}`,
    user: `user:${accountId}`,
    relation: relation,
  });
};

export const getContext = async (
  query: QueryContextDto & { accountId: string },
) => {
  const { accountId } = query;
  const contextIds = await listObjects({
    user: `user:${accountId}`,
    type: "context",
    relation: "can_edit",
  });

  const contexts = await contextRepositoy.getContext({ ...query, contextIds });
  return contexts;
};

export const createContext = async (requestBody: CreateContextDto) => {
  const { name, accountId } = requestBody;
  const existingContext = await getContext({
    name,
    accountId,
  });
  if (existingContext.length) {
    throw new HttpException(409, `'${name}' already exists`);
  }
  try {
    return await contextRepositoy.createContext(requestBody);
  } catch (error) {
    // The check above reads the authorization index, which lags the database.
    // The partial unique index on (account_id, name) WHERE archived_at IS NULL
    // is the real guard, so losing that race surfaces here.
    if (isUniqueConstraintError(error)) {
      throw new HttpException(409, `'${name}' already exists`);
    }
    throw error;
  }
};

export const shareContext = async (
  body: { email: string; accountId: string; id: string },
) => {
  const { id, accountId, email } = body;

  await authContextCheck({ accountId, contextId: id, relation: "owner" });
  const account = await getAccountByEmail(email);

  // Persist the share (source of truth) and enqueue the authorization write
  // atomically, so it can always be recovered by reconciliation.
  await prisma.$transaction(async (trx) => {
    await trx.contextShare.upsert({
      where: {
        contextId_accountId_relation: {
          contextId: id,
          accountId: account.id,
          relation: "editor",
        },
      },
      create: {
        contextId: id,
        accountId: account.id,
        relation: "editor",
        createdBy: accountId,
      },
      update: {},
    });

    await syncAuthorization({ type: "context", id }, trx);
  });
};

export const getShareRecipients = async (
  body: { accountId: string; id: string },
) => {
  const { id, accountId } = body;

  await authContextCheck({ accountId, contextId: id, relation: "owner" });
  const users = await listUsers({
    userType: "user",
    objectType: "context",
    id,
    relation: "editor",
  });
  const accountIds = users.map((u) => u.object.id);
  const accounts = await getAccountsByIds(accountIds);
  return accounts;
};

export const getSharedContexts = async (body: { accountId: string }) => {
  const { accountId } = body;

  const contextIds = await listObjects({
    user: `user:${accountId}`,
    type: "context",
    relation: "owner",
  });

  const sharedUserIds = await Promise.all(
    contextIds.map((cId) =>
      listUsers({
        userType: "user",
        objectType: "context",
        id: cId,
        relation: "editor",
      })
    ),
  );

  const sharedContextIds = [];
  for (let i = 0; i < contextIds.length; i++) {
    if (sharedUserIds[i].length) {
      sharedContextIds.push(contextIds[i]);
    }
  }

  return await contextRepositoy.getContext({ contextIds: sharedContextIds });
};

export const updateContext = async (requestBody: UpdateContextDto) => {
  const { id, name, accountId } = requestBody;
  await authContextCheck({ accountId, contextId: id, relation: "owner" });
  const context = await getContextById({ contextId: id, accountId });

  if (context.endedAt) {
    throw new HttpException(
      422,
      "context cannot be updated once it has ended",
    );
  }

  if (name) {
    if (name === context.name) {
      throw new HttpException(409, `context's name not changed`);
    }

    const existingContext = await getContext({
      name,
      accountId,
    });
    if (existingContext.length) {
      throw new HttpException(409, `'${name}' already exists`);
    }
  }

  try {
    return await contextRepositoy.updateContext({ ...requestBody });
  } catch (error) {
    // Same partial unique index as createContext; a rename that loses the race
    // against the authorization index surfaces here.
    if (name && isUniqueConstraintError(error)) {
      throw new HttpException(409, `'${name}' already exists`);
    }
    throw error;
  }
};

export const deleteContext = async (requestBody: UniqueContextDto) => {
  const { contextId, accountId } = requestBody;
  await authContextCheck({ accountId, contextId, relation: "owner" });
  const context = await getContextById(requestBody);

  return await contextRepositoy.updateContext({
    id: contextId,
    archive: true,
    ...(!context.endedAt && { end: true }),
  });
};

/** Re-queues the authorization sync for a context the caller owns. */
export const resyncContext = async (requestBody: UniqueContextDto) => {
  const { contextId, accountId } = requestBody;
  await authContextCheck({ accountId, contextId, relation: "owner" });
  await syncAuthorization({ type: "context", id: contextId });
};
