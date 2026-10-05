import prisma from "../infra/prisma.ts";
import { syncAuthorization } from "../service/authorization-sync.service.ts";
import { ACTIVE_CONFIG_SNAPSHOT_NAME } from "../service/utils/constants.ts";
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
  const { limit, offset, order, orderBy, deviceId } = query;

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

export const createLog = async (body: {
  deviceId: string;
  accountId: string;
  log: string;
}) => {
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

export const getActiveBind = async (body: { deviceId: string }) => {
  return await prisma.bind.findFirst({
    where: {
      deviceId: body.deviceId,
      unboundAt: null,
      archivedAt: null,
    },
    select: { id: true, accountId: true },
    orderBy: { boundAt: "asc" },
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
            where: {
              name: ACTIVE_CONFIG_SNAPSHOT_NAME,
              active: true,
              archivedAt: null,
            },
            orderBy: { createdAt: "asc" },
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
        orderBy: { createdAt: "desc" },
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
          serialNumber: serialNumber || {
            contains: search,
            mode: "insensitive",
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

    await syncAuthorization({ type: "account", id: accountId }, trx);

    return device;
  });
};

export const bindDevice = async (body: {
  accountId: string;
  deviceId: string;
}) => {
  const { deviceId, accountId } = body;
  return await prisma.$transaction(async (trx) => {
    const bind = await trx.bind.create({
      data: {
        Account: { connect: { id: accountId } },
        Device: { connect: { id: deviceId } },
      },
    });
    await syncAuthorization({ type: "account", id: accountId }, trx);
    return bind;
  });
};

export const unbindDevice = async (body: { bindId: string }) => {
  const { bindId } = body;

  return await prisma.$transaction(async (trx) => {
    const bind = await trx.bind.findUnique({
      where: { id: bindId },
      select: { accountId: true, deviceId: true },
    });
    if (!bind) {
      return;
    }

    const endedContexts = await trx.deviceContext.findMany({
      where: { deviceId: bind.deviceId, endedAt: null },
      select: { contextId: true },
    });

    await trx.bind.update({
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

    await syncAuthorization({ type: "account", id: bind.accountId }, trx);
    for (const { contextId } of endedContexts) {
      await syncAuthorization({ type: "context", id: contextId }, trx);
    }
  });
};

export const deleteDevice = async (
  body: SerialNumberDeviceDto & { accountId: string },
) => {
  const { serialNumber, accountId } = body;

  return await prisma.$transaction(async (trx) => {
    const device = await trx.device.findUnique({
      where: { serialNumber },
      select: { id: true },
    });
    const endedContexts = device
      ? await trx.deviceContext.findMany({
        where: { deviceId: device.id, endedAt: null },
        select: { contextId: true },
      })
      : [];

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

    await syncAuthorization({ type: "account", id: accountId }, trx);
    for (const { contextId } of endedContexts) {
      await syncAuthorization({ type: "context", id: contextId }, trx);
    }
  });
};

export const createFirmwareEntry = async (body: {
  version: string;
  installedAt: Date;
  accountId: string;
  deviceContextId: string;
}) => {
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
  const { limit, offset, order, orderBy, id, asAt, from, to } = query;

  if (asAt) {
    // Latest install at or before `asAt` — the firmware in effect then.
    return await prisma.deviceFirmwareHistory.findMany({
      where: {
        DeviceContext: { deviceId: id },
        installedAt: { lte: asAt },
      },
      include: {
        DeviceContext: { select: { Context: { select: { name: true } } } },
      },
      orderBy: { installedAt: "desc" },
      take: 1,
    });
  }

  return await prisma.deviceFirmwareHistory.findMany({
    where: {
      DeviceContext: { deviceId: id },
      installedAt: { gte: from, lte: to },
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
export const getAllDevices = async (body: {
  query: { uniqueName?: string; uid?: string; type?: string };
  orderBy?: "createdAt";
  order?: "asc" | "desc";
  limit?: number;
}) => {
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
