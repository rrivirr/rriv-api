import {
  CreateContextDto,
  QueryContextDto,
  UpdateContextDto,
} from "../handler/context/schema.ts";
import prisma from "../infra/prisma.ts";

export const createContext = async (requestBody: CreateContextDto) => {
  return await prisma.context.create({
    data: { ...requestBody },
  });
};

export const getContext = async (query: QueryContextDto) => {
  const { search, limit, offset, order, orderBy, name, accountId } = query;
  return await prisma.context.findMany({
    where: {
      name: name || { contains: search, mode: "insensitive" },
      accountId,
      archivedAt: null,
    },
    take: limit,
    skip: offset,
    orderBy: orderBy ? { [orderBy]: order } : undefined,
  });
};

export const getContextById = async (id: string, accountId: string) => {
  return await prisma.context.findUnique({ where: { id, accountId } });
};

export const updateContext = async (requestBody: UpdateContextDto) => {
  const { id, name, archive, end } = requestBody;

  return await prisma.context.update({
    where: {
      id,
    },
    data: {
      name,
      ...(archive && {
        archivedAt: new Date(),
        DeviceContext: {
          updateMany: {
            where: { archivedAt: null },
            data: { archivedAt: new Date() },
          },
        },
      }),
      ...(end && {
        endedAt: new Date(),
        DeviceContext: {
          updateMany: {
            where: { endedAt: null },
            data: { endedAt: new Date() },
          },
        },
      }),
    },
  });
};
