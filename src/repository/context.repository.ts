import {
  CreateContextDto,
  QueryContextDto,
  UpdateContextDto,
} from "../types/context.types.ts";
import prisma from "../infra/prisma.ts";
import { syncAuthorization } from "../service/authorization-sync.service.ts";

export const createContext = async (requestBody: CreateContextDto) => {
  await prisma.$transaction(async (trx) => {
    const context = await trx.context.create({
      data: { ...requestBody },
    });
    await syncAuthorization({ type: "context", id: context.id }, trx);
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
  },
) => {
  const { id, name, archive, end } = requestBody;

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

    await syncAuthorization({ type: "context", id }, trx);
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
