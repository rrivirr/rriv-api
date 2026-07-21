import {
  CreateContextDto,
  QueryContextDto,
  UpdateContextDto,
} from "../types/context.types.ts";
import prisma from "../infra/prisma.ts";
import { SYSTEM, writeRelationships } from "../service/auth.service.ts";
import { Tuple } from "../types/auth-service.types.ts";

export const createContext = async (requestBody: CreateContextDto) => {
  await prisma.$transaction(async (trx) => {
    const context = await trx.context.create({
      data: { ...requestBody },
    });
    await writeRelationships({
      writes: [{
        user: SYSTEM,
        object: `context:${context.id}`,
        relation: "system",
      }, {
        user: `user:${requestBody.accountId}`,
        object: `context:${context.id}`,
        relation: "owner",
      }],
      trx,
      singletonKey: context.id,
    });
    return context;
  });
};

export const getContext = async (
  query: QueryContextDto & { contextIds: string[] },
) => {
  const {
    search,
    limit,
    offset,
    order,
    orderBy,
    name,
    contextIds,
    ended,
  } = query;
  return await prisma.context.findMany({
    where: {
      id: { in: contextIds },
      name: name || { contains: search },
      endedAt: ended ? { not: null } : ended === false ? null : undefined,
    },
    include: { Account: { select: { id: true, email: true } } },
    take: limit,
    skip: offset,
    orderBy: orderBy ? { [orderBy]: order } : undefined,
  });
};

export const getContextById = async (contextId: string) => {
  return await prisma.context.findUnique({
    where: { id: contextId },
  });
};

export const updateContext = async (
  requestBody: Omit<UpdateContextDto, "accountId"> & {
    archive?: true;
    deletes?: Tuple[];
  },
) => {
  const { id, name, archive, end, deletes } = requestBody;

  return await prisma.$transaction(async (trx) => {
    if (end) {
      await trx.deviceContext.updateMany({
        where: { contextId: id, endedAt: null },
        data: { endedAt: new Date() },
      });
    }

    if (archive) {
      await trx.deviceContext.updateMany({
        where: { contextId: id, archivedAt: null },
        data: { archivedAt: new Date() },
      });
    }

    await writeRelationships({ deletes, singletonKey: id, trx });
    return await trx.context.update({
      where: { id },
      data: {
        name,
        ...(end && { endedAt: new Date() }),
        ...(archive && { archivedAt: new Date() }),
      },
    });
  });
};
