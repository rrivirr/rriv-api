import {
  CreateContextDto,
  QueryContextDto,
  UniqueContextDto,
  UpdateContextDto,
} from "../types/context.types.ts";
import * as contextRepositoy from "../repository/context.repository.ts";
import { HttpException } from "../utils/http-exception.ts";
import {
  authorizationCheck,
  listObjects,
  listUsers,
  read,
  SYSTEM,
  writeRelationships,
} from "./auth.service.ts";
import { getAccountByEmail, getAccountsByIds } from "./account.service.ts";

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
  return contexts.map((c) => ({
    ...c,
    ...(c.Account.id === accountId && { Account: undefined }),
  }));
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
  return await contextRepositoy.createContext(requestBody);
};

export const shareContext = async (
  body: { email: string; accountId: string; id: string },
) => {
  const { id, accountId, email } = body;

  await authContextCheck({ accountId, contextId: id, relation: "owner" });
  const account = await getAccountByEmail(email);

  await writeRelationships({
    writes: [{
      user: `user:${account.id}`,
      object: `context:${id}`,
      relation: "editor",
    }],
    deletes: [],
    singletonKey: id,
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

const getContextTuples = async (
  requestBody: UniqueContextDto & { toEnd?: boolean },
) => {
  const { contextId, accountId, toEnd } = requestBody;

  const tuples = await read({
    user: `context:${contextId}`,
    object: `device:`,
  });

  if (toEnd) {
    return tuples;
  }

  const deletes = [{
    user: SYSTEM,
    object: `context:${contextId}`,
    relation: "system",
  }, {
    user: `user:${accountId}`,
    object: `context:${contextId}`,
    relation: "owner",
  }];

  return [...deletes, ...tuples];
};

export const updateContext = async (requestBody: UpdateContextDto) => {
  const { id, name, accountId, end } = requestBody;
  await authContextCheck({ accountId, contextId: id, relation: "owner" });
  const context = await getContextById({ contextId: id, accountId });
  let deletes;

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

  if (end) {
    deletes = await getContextTuples({ accountId, contextId: id, toEnd: true });
  }

  return await contextRepositoy.updateContext({ ...requestBody, deletes });
};

export const deleteContext = async (requestBody: UniqueContextDto) => {
  const { contextId, accountId } = requestBody;
  await authContextCheck({ accountId, contextId, relation: "owner" });
  const context = await getContextById(requestBody);
  const deletes = await getContextTuples({
    accountId,
    contextId: contextId,
  });

  return await contextRepositoy.updateContext({
    id: contextId,
    archive: true,
    deletes,
    ...(!context.endedAt && { end: true }),
  });
};
