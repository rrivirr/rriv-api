import prisma from "../infra/prisma.ts";
import { SYSTEM, writeRelationships } from "../service/auth.service.ts";
import { ACTIVE_CONFIG_SNAPSHOT_NAME } from "../service/utils/constants.ts";
import { Tuple } from "../types/auth-service.types.ts";
import {
  DeviceIdentifierDto,
  ProvisionDeviceDto,
  QueryDeviceDto,
  QueryFirmwareHistoryDto,
  QueryLogsDto,
  RegisterEuiDto,
  SerialNumberDeviceDto,
} from "../types/device.types.ts";
import { IdDto } from "../types/generic.types.ts";
import { isId } from "../utils/helper-functions.ts";

export const getLogs = async (
  query: Omit<Omit<QueryLogsDto, "identifier">, "accountId"> & {
    deviceId: string;
  },
) => {
  const {
    limit,
    offset,
    order,
    orderBy,
    deviceId,
  } = query;

  return await prisma.deviceLog.findMany({
    where: {
      deviceId,
    },
    select: {
      log: true,
      createdAt: true,
      Creator: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    take: limit,
    skip: offset,
    orderBy: orderBy ? { [orderBy]: order } : undefined,
  });
};

export const createLog = async (
  body: { deviceId: string; accountId: string; log: string },
) => {
  const { deviceId, accountId, log } = body;
  await prisma.deviceLog.create({
    data: {
      deviceId,
      creatorId: accountId,
      log,
    },
  });
};

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

export const getDeviceByIdentifierOrId = async (
  body: DeviceIdentifierDto | IdDto,
) => {
  return await prisma.device.findFirst({
    where: {
      ...(isId(body) ? { id: body.id } : {
        OR: [
          { uniqueName: body.deviceIdentifier },
          { serialNumber: body.deviceIdentifier },
        ],
      }),
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
      DeviceEuis: {
        where: { active: true },
        select: { eui: true },
      },
    },
  });
};

export const getDevices = async (
  query: QueryDeviceDto & { deviceIds: string[] },
) => {
  const {
    search,
    limit,
    offset,
    order,
    orderBy,
    contextId,
    serialNumber,
    uniqueName,
    identifier,
    deviceIds,
  } = query;

  return await prisma.device.findMany({
    where: {
      ...(identifier
        ? {
          id: { in: deviceIds },
          OR: [
            { uniqueName: identifier },
            { serialNumber: identifier },
            {
              DeviceContext: {
                some: {
                  endedAt: null,
                  archivedAt: null,
                  assignedDeviceName: identifier,
                  contextId,
                },
              },
            },
          ],
        }
        : {
          id: { in: deviceIds },
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

  return await prisma.$transaction(async (trx) => {
    const device = await trx.device.create({
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

    await writeRelationships({
      writes: [{
        user: SYSTEM,
        object: `device:${device.id}`,
        relation: "system",
      }],
      trx,
      singletonKey: accountId,
    });

    return device;
  });
};

export const bindDevice = async (
  body: { accountId: string; deviceId: string },
) => {
  const { deviceId, accountId } = body;
  return await prisma.$transaction(async (trx) => {
    await writeRelationships({
      writes: [{
        user: `user:${accountId}`,
        object: `device:${deviceId}`,
        relation: "owner",
      }],
      trx,
      singletonKey: accountId,
    });
    return await trx.bind.create({
      data: {
        Account: { connect: { id: accountId } },
        Device: { connect: { id: deviceId } },
      },
    });
  });
};

export const unbindDevice = async (
  body: { bindId: string },
) => {
  const { bindId } = body;

  return await prisma.$transaction(async (trx) => {
    const bind = await trx.bind.update({
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
    await writeRelationships({
      deletes: [{
        user: `user:${bind.accountId}`,
        object: `device:${bind.deviceId}`,
        relation: "owner",
      }],
      trx,
      singletonKey: bind.accountId,
    });
  });
};

export const deleteDevice = async (
  body: SerialNumberDeviceDto & { accountId: string; deletes: Tuple[] },
) => {
  const { serialNumber, accountId, deletes } = body;

  return await prisma.$transaction(async (trx) => {
    await trx.deviceContext.updateManyAndReturn({
      where: {
        Device: { serialNumber },
        endedAt: null,
        archivedAt: null,
      },
      data: {
        endedAt: new Date(),
        archivedAt: new Date(),
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

    await writeRelationships({
      deletes,
      trx,
      singletonKey: accountId,
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
  query: QueryFirmwareHistoryDto & { id: string },
) => {
  const { limit, offset, order, orderBy, id } = query;
  return await prisma.deviceFirmwareHistory.findMany({
    where: {
      DeviceContext: { deviceId: id },
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
