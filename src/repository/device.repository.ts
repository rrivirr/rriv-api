import prisma from "../infra/prisma.ts";
import { ACTIVE_CONFIG_SNAPSHOT_NAME } from "../service/utils/constants.ts";
import {
  AccountUniqueDeviceDto,
  BindDeviceDto,
  QueryDeviceDto,
  SerialNumberDeviceDto,
} from "../types/device.types.ts";
import { IdDto } from "../types/generic.types.ts";
import { isId } from "../utils/helper-functions.ts";

export const getDeviceBySerialNumberOrId = async (
  body: SerialNumberDeviceDto | IdDto,
) => {
  return await prisma.device.findUnique({
    where: {
      ...(isId(body) ? { id: body.id } : { serialNumber: body.serialNumber }),
      archivedAt: null,
    },
    include: {
      Bind: {
        where: {
          unboundAt: null,
          archivedAt: null,
        },
      },
      DeviceContext: {
        include: {
          Context: { select: { name: true } },
          ConfigSnapshot: {
            select: { id: true },
            where: { name: ACTIVE_CONFIG_SNAPSHOT_NAME, archivedAt: null },
          },
        },
        where: {
          archivedAt: null,
          endedAt: null,
        },
      },
    },
  });
};

export const getDevice = async (query: QueryDeviceDto) => {
  const {
    search,
    limit,
    offset,
    order,
    orderBy,
    accountId,
    contextId,
    id,
    serialNumber,
    uniqueName,
  } = query;

  return await prisma.device.findMany({
    where: {
      id,
      uniqueName: uniqueName || { contains: search, mode: "insensitive" },
      serialNumber: serialNumber || { contains: search, mode: "insensitive" },
      archivedAt: null,
      Bind: {
        some: {
          accountId,
          unboundAt: null,
          archivedAt: null,
        },
      },
      ...(contextId && {
        DeviceContext: {
          some: {
            endedAt: null,
            archivedAt: null,
            contextId,
          },
        },
      }),
    },
    include: {
      DeviceContext: {
        where: {
          endedAt: null,
          archivedAt: null,
        },
        select: {
          assignedDeviceName: true,
          Context: { select: { name: true } },
        },
      },
    },
    take: limit,
    skip: offset,
    orderBy: orderBy ? { [orderBy]: order } : undefined,
  });
};

export const createDevice = async (
  body: BindDeviceDto & { uniqueName: string },
) => {
  const { accountId, serialNumber, uniqueName } = body;

  return await prisma.device.create({
    data: {
      uniqueName,
      serialNumber,
      Bind: {
        create: {
          accountId,
        },
      },
    },
  });
};

export const bindDevice = async (body: AccountUniqueDeviceDto) => {
  const { serialNumber, accountId } = body;

  return await prisma.bind.create({
    data: {
      Account: { connect: { id: accountId } },
      Device: { connect: { serialNumber } },
    },
  });
};

export const unbindDevice = async (body: { bindId: string }) => {
  const { bindId } = body;

  return await prisma.bind.update({
    where: { id: bindId },
    data: {
      unboundAt: new Date(),
      Device: {
        update: {
          DeviceContext: {
            updateMany: {
              where: { endedAt: null },
              data: { endedAt: new Date() },
            },
          },
        },
      },
    },
  });
};

export const deleteDevice = async (body: SerialNumberDeviceDto) => {
  const { serialNumber } = body;

  return await prisma.$transaction(async (trx) => {
    await trx.deviceContext.updateMany({
      where: {
        Device: { serialNumber },
        endedAt: null,
      },
      data: {
        endedAt: new Date(),
      },
    });

    await trx.device.update({
      where: { serialNumber },
      data: {
        archivedAt: new Date(),
        Bind: {
          updateMany: {
            where: { unboundAt: null },
            data: {
              archivedAt: new Date(),
              unboundAt: new Date(),
            },
          },
        },
        DeviceContext: {
          updateMany: {
            where: { archivedAt: null },
            data: { archivedAt: new Date() },
          },
        },
      },
    });
  });
};

export const getDeviceByUniqueName = async (body: { uniqueName: string }) => {
  return await prisma.device.findUnique({ where: { ...body } });
};
