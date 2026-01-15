import prisma from "../infra/prisma.ts";
import { ACTIVE_CONFIG_SNAPSHOT_NAME } from "../service/utils/constants.ts";
import {
  AccountUniqueDeviceDto,
  ProvisionDeviceDto,
  QueryDeviceDto,
  QueryFirmwareHistoryDto,
  RegisterEuiDto,
  SerialNumberDeviceDto,
} from "../types/device.types.ts";
import { IdDto } from "../types/generic.types.ts";
import { isId } from "../utils/helper-functions.ts";

export const registerEui = async (body: RegisterEuiDto) => {
  const { deviceId, eui, accountId } = body;

  return await prisma.$transaction(async (trx) => {
    await trx.deviceEui.updateMany({
      where: { active: true, deviceId },
      data: { active: false },
    });

    await trx.deviceEui.create({
      data: {
        eui,
        active: true,
        creatorId: accountId,
        deviceId,
      },
    });
  });
};

export const getActiveEui = async (body: { deviceId: string }) => {
  return await prisma.deviceEui.findFirst({
    where: { deviceId: body.deviceId, active: true },
  });
};

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

export const getDevices = async (query: QueryDeviceDto) => {
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
    identifier,
  } = query;

  return await prisma.device.findMany({
    where: {
      ...(identifier
        ? {
          OR: [
            { uniqueName: identifier },
            { serialNumber: identifier },
          ],
        }
        : {
          id,
          uniqueName: uniqueName || { contains: search, mode: "insensitive" },
          serialNumber: serialNumber ||
            { contains: search, mode: "insensitive" },
          ...(contextId && {
            DeviceContext: {
              some: {
                endedAt: null,
                archivedAt: null,
                contextId,
              },
            },
          }),
        }),
      archivedAt: null,
      Bind: {
        some: {
          accountId,
          unboundAt: null,
          archivedAt: null,
        },
      },
    },
    include: {
      DeviceContext: {
        where: {
          endedAt: null,
          archivedAt: null,
        },
        select: {
          assignedDeviceName: true,
          Context: { select: { name: true, id: true } },
        },
      },
      DeviceEuis: {
        where: { active: true },
        select: { eui: true },
      },
    },
    take: limit,
    skip: offset,
    orderBy: orderBy ? { [orderBy]: order } : undefined,
  });
};

export const createDevice = async (
  body: ProvisionDeviceDto & { uniqueName: string; serialNumber: string },
) => {
  const { uniqueName, serialNumber, uid, type, accountId } = body;
  return await prisma.device.create({
    data: {
      uniqueName,
      serialNumber,
      uid,
      type,
      ProvisionedBy: {
        connect: {
          id: accountId,
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

export const createFirmwareEntry = async (
  body: {
    version: string;
    installedAt: Date;
    accountId: string;
    deviceContextId: string;
  },
) => {
  const { version, installedAt, accountId, deviceContextId } = body;
  return await prisma.deviceFirmwareHistory.create({
    data: {
      creatorId: accountId,
      version,
      installedAt,
      deviceContextId,
    },
  });
};

export const getFirmwareHistory = async (
  query: QueryFirmwareHistoryDto,
) => {
  const { limit, offset, order, orderBy, accountId } = query;
  return await prisma.deviceFirmwareHistory.findMany({
    where: {
      creatorId: accountId,
      ...("deviceId" in query
        ? { DeviceContext: { deviceId: query.deviceId } }
        : { DeviceContext: { Device: { serialNumber: query.serialNumber } } }),
    },
    include: {
      DeviceContext: { select: { Context: { select: { name: true } } } },
    },
    orderBy: orderBy ? { [orderBy]: order } : undefined,
    take: limit,
    skip: offset,
  });
};

// provides additional flexibility
// not intended for direct client requests/results
// use getDevices instead
export const getAllDevices = async (
  body: {
    query: { uniqueName?: string; uid?: string; type?: string };
    orderBy?: "createdAt";
    order?: "asc" | "desc";
    limit?: number;
  },
) => {
  const { query, orderBy, order, limit } = body;
  return await prisma.device.findMany({
    where: query,
    take: limit,
    orderBy: orderBy ? { [orderBy]: order } : undefined,
    include: {
      Bind: {
        select: {
          id: true,
        },
        where: {
          unboundAt: null,
          archivedAt: null,
        },
      },
    },
  });
};
