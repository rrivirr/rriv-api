// @ts-types="generated/index.d.ts"
import { DataloggerConfig, Prisma } from "generated/index.js";
import prisma from "../infra/prisma.ts";
import { IdDto } from "../types/generic.types.ts";
import {
  CreateDataloggerConfigDto,
  CreateDataloggerDriverDto,
  QueryDataloggerDriverDto,
  QueryDataloggerLibraryConfigDto,
} from "../types/datalogger.types.ts";

export const getDataloggerDriverById = async (query: IdDto) => {
  const { id } = query;
  return await prisma.dataloggerDriver.findUnique({
    where: {
      id,
      archivedAt: null,
    },
    omit: { creatorId: false },
    include: {
      DataloggerConfig: { where: { archivedAt: null } },
    },
  });
};

export const getDataloggerConfigById = async (query: IdDto) => {
  const { id } = query;
  return await prisma.dataloggerConfig.findUnique({
    where: {
      id,
      archivedAt: null,
    },
    omit: { creatorId: false },
    include: {
      DataloggerLibraryConfigVersion: {
        select: {
          id: true,
        },
      },
    },
  });
};

export const getDataloggerLibraryConfigById = async (query: IdDto) => {
  const { id } = query;
  return await prisma.dataloggerLibraryConfig.findUnique({
    where: {
      id,
      archivedAt: null,
    },
    omit: { creatorId: false },
    include: {
      DataloggerLibraryConfigVersion: {
        where: {
          archivedAt: null,
        },
        orderBy: { version: "desc" },
        select: {
          version: true,
          DataloggerConfig: {
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

export const getDataloggerDriver = async (query: QueryDataloggerDriverDto) => {
  const { search, limit, offset, order, orderBy, name } = query;
  return await prisma.dataloggerDriver.findMany({
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

export const getDataloggerLibraryConfig = async (
  query: QueryDataloggerLibraryConfigDto,
) => {
  const { search, limit, offset, order, orderBy, name, isPublic, accountId } =
    query;
  return await prisma.dataloggerLibraryConfig.findMany({
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

export const createDataloggerDriver = async (
  body: CreateDataloggerDriverDto,
) => {
  const { name, validation, accountId } = body;
  return await prisma.dataloggerDriver.create({
    data: {
      name,
      validation: validation as Prisma.JsonObject,
      Creator: { connect: { id: accountId } },
    },
  });
};

export const createDataloggerConfig = async (
  body: CreateDataloggerConfigDto & {
    active: boolean;
    configSnapshotId: string;
    dataloggerConfigToDeactivateId?: string | null;
  },
) => {
  const {
    name,
    config,
    accountId,
    dataloggerDriverId,
    active,
    configSnapshotId,
    dataloggerConfigToDeactivateId,
    createdAt,
  } = body;

  return await prisma.$transaction(async (trx) => {
    if (dataloggerConfigToDeactivateId) {
      await trx.dataloggerConfig.update({
        where: { id: dataloggerConfigToDeactivateId },
        data: { active: false, deactivatedAt: new Date() },
      });
    }

    return await trx.dataloggerConfig.create({
      data: {
        name,
        config,
        active,
        createdAt,
        DataloggerDriver: { connect: { id: dataloggerDriverId } },
        Creator: { connect: { id: accountId } },
        ConfigSnapshot: { connect: { id: configSnapshotId } },
      },
    });
  });
};

export const createDataloggerLibraryConfig = async (
  body: {
    name: string;
    dataloggerConfig: DataloggerConfig;
    accountId: string;
    description?: string;
  },
) => {
  const { name, dataloggerConfig, accountId, description } = body;
  return await prisma.dataloggerLibraryConfig.create({
    data: {
      name,
      Creator: { connect: { id: accountId } },
      description,
      DataloggerLibraryConfigVersion: {
        create: {
          version: 1,
          Creator: { connect: { id: accountId } },
          DataloggerConfig: {
            create: {
              name: dataloggerConfig.name,
              config: dataloggerConfig.config as Prisma.InputJsonObject,
              active: false,
              DataloggerDriver: {
                connect: { id: dataloggerConfig.dataloggerDriverId },
              },
              Creator: { connect: { id: accountId } },
            },
          },
        },
      },
    },
  });
};

export const createNewDataloggerLibraryConfigVersion = async (
  body: {
    accountId: string;
    version: number;
    dataloggerLibraryConfigId: string;
    dataloggerConfig: DataloggerConfig;
    description?: string;
  },
) => {
  const {
    accountId,
    version,
    dataloggerConfig,
    dataloggerLibraryConfigId,
    description,
  } = body;
  return await prisma.dataloggerLibraryConfigVersion.create({
    data: {
      version,
      Creator: { connect: { id: accountId } },
      description,
      DataloggerLibraryConfig: { connect: { id: dataloggerLibraryConfigId } },
      DataloggerConfig: {
        create: {
          name: dataloggerConfig.name,
          config: dataloggerConfig.config as Prisma.InputJsonObject,
          active: false,
          DataloggerDriver: {
            connect: { id: dataloggerConfig.dataloggerDriverId },
          },
          Creator: { connect: { id: accountId } },
        },
      },
    },
  });
};

export const deleteDataloggerDriver = async (body: IdDto) => {
  const { id } = body;
  return await prisma.dataloggerDriver.update({
    where: { id },
    data: { archivedAt: new Date() },
  });
};

export const deleteDataloggerConfig = async (body: IdDto) => {
  const { id } = body;
  return await prisma.dataloggerConfig.update({
    where: { id },
    data: { archivedAt: new Date() },
  });
};

export const deleteDataloggerLibraryConfig = async (body: IdDto) => {
  const { id } = body;

  return await prisma.$transaction(async (trx) => {
    const libraryConfigVersions = await trx.dataloggerLibraryConfigVersion
      .updateManyAndReturn({
        where: { dataloggerLibraryConfigId: id },
        data: { archivedAt: new Date() },
        select: { dataloggerConfigId: true },
      });

    await trx.dataloggerConfig.updateMany({
      where: {
        id: { in: libraryConfigVersions.map((l) => l.dataloggerConfigId) },
      },
      data: { archivedAt: new Date() },
    });

    return await trx.dataloggerLibraryConfig.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
  });
};
