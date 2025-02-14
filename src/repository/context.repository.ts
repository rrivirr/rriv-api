import {
  CreateContextDto,
  QueryContextDto,
  UniqueContextDto,
  UpdateContextDto,
} from "../types/context.types.ts";
import prisma from "../infra/prisma.ts";

export const createContext = async (requestBody: CreateContextDto) => {
  return await prisma.context.create({
    data: { ...requestBody },
  });
};

export const getContext = async (query: QueryContextDto) => {
  const { search, limit, offset, order, orderBy, name, accountId, deviceId } =
    query;
  return await prisma.context.findMany({
    where: {
      name: name || { contains: search },
      accountId,
      archivedAt: null,
      ...(deviceId && {
        DeviceContext: {
          some: {
            archivedAt: null,
            endedAt: null,
            deviceId,
          },
        },
      }),
    },
    take: limit,
    skip: offset,
    orderBy: orderBy ? { [orderBy]: order } : undefined,
  });
};

export const getContextById = async (body: UniqueContextDto) => {
  const { accountId, contextId } = body;
  return await prisma.context.findUnique({
    where: { id: contextId, accountId, archivedAt: null },
  });
};

export const updateContext = async (
  requestBody: Omit<UpdateContextDto, "accountId"> & { archive?: true },
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
