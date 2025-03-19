// @ts-types="generated/index.d.ts"
import { Prisma, SensorConfig } from "generated/index.js";
import prisma from "../infra/prisma.ts";
import { IdDto } from "../types/generic.types.ts";
import {
  CreateSensorConfigDto,
  CreateSensorDriverDto,
  QuerySensorConfigDto,
  QuerySensorDriverDto,
  QuerySensorLibraryConfigDto,
} from "../types/sensor.types.ts";

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
      SensorLibraryConfigVersion: {
        where: {
          archivedAt: null,
        },
        orderBy: { version: "desc" },
        select: {
          version: true,
          SensorConfig: {
            select: {
              id: true,
              name: true,
              config: true,
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

export const getSensorConfig = async (query: QuerySensorConfigDto) => {
  const {
    name,
    accountId,
    configSnapshotId,
    active,
  } = query;
  return await prisma.sensorConfig.findMany({
    where: {
      name,
      creatorId: accountId,
      configSnapshotId,
      active,
      archivedAt: null,
    },
    include: {
      SensorDriver: {
        select: {
          name: true,
        },
      },
    },
  });
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
  const { search, limit, offset, order, orderBy, name, isPublic, accountId } =
    query;
  return await prisma.sensorLibraryConfig.findMany({
    where: {
      name: name || { contains: search },
      archivedAt: null,
      ...(!isPublic && { creatorId: accountId }),
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
  body: CreateSensorConfigDto & {
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
  } = body;

  return await prisma.$transaction(async (trx) => {
    if (sensorConfigToDeactivateId) {
      await trx.sensorConfig.update({
        where: { id: sensorConfigToDeactivateId },
        data: { active: false, deactivatedAt: new Date() },
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
      },
    });
  });
};

export const createSensorLibraryConfig = async (
  body: { name: string; sensorConfig: SensorConfig; accountId: string },
) => {
  const { name, sensorConfig, accountId } = body;
  return await prisma.sensorLibraryConfig.create({
    data: {
      name,
      Creator: { connect: { id: accountId } },
      SensorLibraryConfigVersion: {
        create: {
          version: 1,
          Creator: { connect: { id: accountId } },
          SensorConfig: {
            create: {
              name: sensorConfig.name,
              config: sensorConfig.config as Prisma.InputJsonObject,
              active: false,
              SensorDriver: {
                connect: { id: sensorConfig.sensorDriverId },
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
    sensorConfig: SensorConfig;
  },
) => {
  const { accountId, version, sensorConfig, sensorLibraryConfigId } = body;
  return await prisma.sensorLibraryConfigVersion.create({
    data: {
      version,
      Creator: { connect: { id: accountId } },
      SensorConfig: {
        create: {
          name: sensorConfig.name,
          config: sensorConfig.config as Prisma.InputJsonObject,
          active: false,
          SensorDriver: {
            connect: { id: sensorConfig.sensorDriverId },
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
