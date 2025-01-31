// @ts-types="generated/index.d.ts"
import { Prisma } from "generated/index.js";
import prisma from "../infra/prisma.ts";
import { IdDto } from "../types/generic.types.ts";
import {
  CreateSensorConfigDto,
  CreateSensorDriverDto,
  CreateSensorLibraryConfigDto,
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
      SensorConfigSnapshot: {
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
    search,
    limit,
    offset,
    order,
    orderBy,
    name,
    accountId,
    sensorDriverId,
  } = query;
  return await prisma.sensorConfig.findMany({
    where: {
      name: name || { contains: search },
      creatorId: accountId,
      sensorDriverId,
      archivedAt: null,
    },
    include: {
      SensorDriver: {
        select: {
          name: true,
        },
      },
    },
    take: limit,
    skip: offset,
    orderBy: orderBy ? { [orderBy]: order } : undefined,
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
  const { search, limit, offset, order, orderBy, name } = query;
  return await prisma.sensorLibraryConfig.findMany({
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

export const createSensorConfig = async (body: CreateSensorConfigDto) => {
  const { name, config, accountId, sensorDriverId } = body;
  return await prisma.sensorConfig.create({
    data: {
      name,
      config,
      SensorDriver: { connect: { id: sensorDriverId } },
      Creator: { connect: { id: accountId } },
    },
  });
};

export const createSensorLibraryConfig = async (
  body: CreateSensorLibraryConfigDto,
) => {
  const { name, sensorConfigId, accountId } = body;
  return await prisma.sensorLibraryConfig.create({
    data: {
      name,
      Creator: { connect: { id: accountId } },
      SensorLibraryConfigVersion: {
        create: {
          version: 1,
          Creator: { connect: { id: accountId } },
          SensorConfig: { connect: { id: sensorConfigId } },
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
    sensorConfigId: string;
  },
) => {
  const { accountId, version, sensorConfigId, sensorLibraryConfigId } = body;
  return await prisma.sensorLibraryConfigVersion.create({
    data: {
      version,
      Creator: { connect: { id: accountId } },
      SensorConfig: { connect: { id: sensorConfigId } },
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
  return await prisma.sensorLibraryConfig.update({
    where: { id },
    data: {
      archivedAt: new Date(),
      SensorLibraryConfigVersion: {
        updateMany: { where: {}, data: { archivedAt: new Date() } },
      },
    },
  });
};
