import { Prisma, SensorConfig } from "generated/client.ts";
import prisma from "../infra/prisma.ts";
import { IdDto } from "../types/generic.types.ts";
import {
  CreateSensorConfigDto,
  CreateSensorDriverDto,
  QuerySensorConfigDto,
  QuerySensorDriverDto,
  QuerySensorLibraryConfigDto,
} from "../types/sensor.types.ts";
import {
  QueryConfigHistoryDto,
  UpdateLibraryConfigDto,
} from "../types/config-snapshot.types.ts";
import { SensorSourceColumns } from "../service/utils/config-source.ts";

export const getSensorDriverById = async (query: IdDto) => {
  const { id } = query;
  return await prisma.sensorDriver.findUnique({
    where: {
      id,
      archivedAt: null,
    },
    omit: { creatorId: false },
    include: {
      SensorConfig: { where: { archivedAt: null } },
    },
  });
};

export const getSensorConfigById = async (query: IdDto) => {
  const { id } = query;
  return await prisma.sensorConfig.findUnique({
    where: {
      id,
      archivedAt: null,
    },
    omit: { creatorId: false },
    include: {
      SensorLibraryConfigVersion: {
        where: {
          archivedAt: null,
        },
      },
    },
  });
};

export const getSensorLibraryConfigById = async (query: IdDto) => {
  const { id } = query;
  return await prisma.sensorLibraryConfig.findUnique({
    where: {
      id,
      archivedAt: null,
    },
    omit: { creatorId: false },
    include: {
      Creator: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      SensorLibraryConfigVersion: {
        where: {
          archivedAt: null,
        },
        orderBy: { version: "desc" },
        select: {
          id: true,
          version: true,
          firmwareVersion: true,
          description: true,
          SensorConfig: {
            select: {
              id: true,
              name: true,
              config: true,
              sensorDriverId: true,
            },
          },
          Creator: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
  });
};

export const getSensorConfig = async (
  query: QuerySensorConfigDto | QueryConfigHistoryDto,
) => {
  if ("configSnapshotId" in query) {
    const {
      name,
      configSnapshotId,
      active,
      limit,
      offset,
      order,
    } = query;

    return await prisma.sensorConfig.findMany({
      where: {
        name,
        configSnapshotId,
        active,
        archivedAt: null,
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: order },
    });
  } else {
    const {
      asAt,
      limit,
      offset,
      order,
      sensorName,
      deviceIdentifier,
      from,
      to,
    } = query;

    if (asAt) {
      const result: SensorConfig[] = await prisma.$queryRaw`
      SELECT 
        id, 
        name,
        config,
        sensor_driver_id as "sensorDriverId",
        creator_id as "creatorId",
        created_at as "createdAt",
        archived_at as "archivedAt",
        active,
        config_snapshot_id as "configSnapshotId",
        deactivated_at as "deactivatedAt"
      FROM (
        SELECT sensor_config.*,
              ROW_NUMBER() OVER (
                PARTITION BY sensor_config.name
                ORDER BY sensor_config.created_at DESC
              ) as rn
        FROM sensor_config
        JOIN config_snapshot
              ON sensor_config.config_snapshot_id = config_snapshot.id
        JOIN device_context
              ON config_snapshot.device_context_id = device_context.id
        JOIN device
              ON device_context.device_id = device.id
        WHERE (device.serial_number = ${deviceIdentifier} OR device.unique_name = ${deviceIdentifier}) 
              AND sensor_config.created_at <= ${asAt}
              AND sensor_config.archived_at IS NULL
              AND (${sensorName}::text is NULL OR sensor_config.name = ${sensorName})
      ) subquery
      -- The newest row per name, unless it had ended by then (the sensor was
      -- removed). A replaced row ends when its successor starts, so the
      -- newest row is only ended by a removal.
      WHERE rn = 1
        AND (deactivated_at IS NULL OR deactivated_at > ${asAt});
    `;
      return result.map((r) => ({ ...r, rn: undefined }));
    }

    return await prisma.sensorConfig.findMany({
      where: {
        name: sensorName,
        ConfigSnapshot: {
          DeviceContext: {
            Device: {
              OR: [{ uniqueName: deviceIdentifier }, {
                serialNumber: deviceIdentifier,
              }],
            },
          },
        },
        createdAt: { gte: from, lte: to },
        archivedAt: null,
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: order },
      include: {
        Creator: {
          select: { firstName: true, lastName: true },
        },
        ConfigSnapshot: {
          select: {
            DeviceContext: {
              select: {
                Context: { select: { name: true } },
              },
            },
          },
        },
      },
    });
  }
};

export const getSensorDriver = async (query: QuerySensorDriverDto) => {
  const { search, limit, offset, order, orderBy, name } = query;
  return await prisma.sensorDriver.findMany({
    where: {
      name: name || { contains: search },
      archivedAt: null,
    },
    take: limit,
    skip: offset,
    orderBy: orderBy ? { [orderBy]: order } : undefined,
    include: {
      Creator: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });
};

export const getSensorLibraryConfig = async (
  query: QuerySensorLibraryConfigDto,
) => {
  const {
    search,
    limit,
    offset,
    order,
    orderBy,
    name,
    isPublic,
    accountId,
    author,
    isOfficial,
  } = query;
  return await prisma.sensorLibraryConfig.findMany({
    where: {
      name: name || { contains: search },
      archivedAt: null,
      isOfficial,
      ...(author
        ? {
          Creator: {
            OR: [{ firstName: author }, { lastName: author }],
          },
          isPublic: true,
        }
        : { creatorId: isPublic === true ? undefined : accountId, isPublic }),
    },
    take: limit,
    skip: offset,
    orderBy: orderBy ? { [orderBy]: order } : undefined,
    include: {
      Creator: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });
};

export const createSensorDriver = async (body: CreateSensorDriverDto) => {
  const { name, validation, accountId } = body;
  return await prisma.sensorDriver.create({
    data: {
      name,
      validation: validation as Prisma.JsonObject,
      Creator: { connect: { id: accountId } },
    },
  });
};

export const createSensorConfig = async (
  body: CreateSensorConfigDto & SensorSourceColumns & {
    active: boolean;
    configSnapshotId: string;
    sensorConfigToDeactivateId?: string;
  },
) => {
  const {
    name,
    config,
    accountId,
    sensorDriverId,
    active,
    configSnapshotId,
    sensorConfigToDeactivateId,
    createdAt,
    sourceSensorLibraryConfigVersionId,
    sourceSystemLibraryConfigVersionId,
  } = body;

  return await prisma.$transaction(async (trx) => {
    if (sensorConfigToDeactivateId) {
      await trx.sensorConfig.update({
        where: { id: sensorConfigToDeactivateId },
        data: { active: false, deactivatedAt: createdAt },
      });
    }

    return await trx.sensorConfig.create({
      data: {
        name,
        config,
        active,
        createdAt,
        SensorDriver: { connect: { id: sensorDriverId } },
        Creator: { connect: { id: accountId } },
        ConfigSnapshot: { connect: { id: configSnapshotId } },
        ...(sourceSensorLibraryConfigVersionId && {
          SourceSensorLibraryConfigVersion: {
            connect: { id: sourceSensorLibraryConfigVersionId },
          },
        }),
        ...(sourceSystemLibraryConfigVersionId && {
          SourceSystemLibraryConfigVersion: {
            connect: { id: sourceSystemLibraryConfigVersionId },
          },
        }),
      },
    });
  });
};

export const deactivateSensorConfigs = async (
  body: { ids: string[]; deactivatedAt: Date },
) => {
  const { ids, deactivatedAt } = body;
  const [deactivated] = await prisma.sensorConfig.updateManyAndReturn({
    where: { id: { in: ids }, active: true },
    data: { active: false, deactivatedAt },
  });
  return deactivated ?? null;
};

export const createSensorLibraryConfig = async (
  body: {
    name: string;
    sensorConfig: { config: object; driverId: string; name: string };
    accountId: string;
    description?: string;
    firmwareVersion?: string;
  },
) => {
  const { name, sensorConfig, accountId, description, firmwareVersion } = body;
  return await prisma.sensorLibraryConfig.create({
    data: {
      name,
      Creator: { connect: { id: accountId } },
      description,
      SensorLibraryConfigVersion: {
        create: {
          version: 1,
          firmwareVersion,
          Creator: { connect: { id: accountId } },
          SensorConfig: {
            create: {
              name: `${sensorConfig.name}`,
              config: sensorConfig.config as Prisma.InputJsonObject,
              active: false,
              SensorDriver: {
                connect: { id: sensorConfig.driverId },
              },
              Creator: { connect: { id: accountId } },
            },
          },
        },
      },
    },
  });
};

export const createNewSensorLibraryConfigVersion = async (
  body: {
    accountId: string;
    version: number;
    sensorLibraryConfigId: string;
    sensorConfig: { config: object; driverId: string; name: string };
    description?: string;
    firmwareVersion?: string;
  },
) => {
  const {
    accountId,
    version,
    firmwareVersion,
    sensorConfig,
    sensorLibraryConfigId,
    description,
  } = body;
  return await prisma.sensorLibraryConfigVersion.create({
    data: {
      version,
      firmwareVersion,
      Creator: { connect: { id: accountId } },
      description,
      SensorConfig: {
        create: {
          name: sensorConfig.name,
          config: sensorConfig.config as Prisma.InputJsonObject,
          active: false,
          SensorDriver: {
            connect: { id: sensorConfig.driverId },
          },
          Creator: { connect: { id: accountId } },
        },
      },
      SensorLibraryConfig: { connect: { id: sensorLibraryConfigId } },
    },
  });
};

export const deleteSensorDriver = async (body: IdDto) => {
  const { id } = body;
  return await prisma.sensorDriver.update({
    where: { id },
    data: { archivedAt: new Date() },
  });
};

export const deleteSensorConfig = async (body: IdDto) => {
  const { id } = body;
  return await prisma.sensorConfig.update({
    where: { id },
    data: { archivedAt: new Date() },
  });
};

export const deleteSensorLibraryConfig = async (body: IdDto) => {
  const { id } = body;

  return await prisma.$transaction(async (trx) => {
    const libraryConfigVersions = await trx.sensorLibraryConfigVersion
      .updateManyAndReturn({
        where: { sensorLibraryConfigId: id },
        data: { archivedAt: new Date() },
        select: { sensorConfigId: true },
      });

    await trx.sensorConfig.updateMany({
      where: {
        id: { in: libraryConfigVersions.map((l) => l.sensorConfigId) },
      },
      data: { archivedAt: new Date() },
    });

    return await trx.sensorLibraryConfig.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
  });
};

export const updateSensorLibraryConfig = async (
  body: UpdateLibraryConfigDto,
) => {
  const { isPublic, name, description, id } = body;
  return await prisma.sensorLibraryConfig.update({
    where: { id },
    data: { isPublic, name, description },
  });
};
