import { Prisma } from "generated/client.ts";
import prisma from "../infra/prisma.ts";
import {
  ConfigSnapshotDto,
  QueryConfigSnapshotDto,
  QueryConfigSnapshotLibraryConfigDto,
  UpdateLibraryConfigDto,
} from "../types/config-snapshot.types.ts";
import { IdDto } from "../types/generic.types.ts";
import { InputJsonValue } from "generated/internal/prismaNamespace.ts";
import { HttpException } from "../utils/http-exception.ts";

export const createConfigSnapshot = async (
  body: {
    name: string;
    accountId: string;
    active: boolean;
    deviceContextId: string;
  },
) => {
  const { name, accountId, active, deviceContextId } = body;
  return await prisma.configSnapshot.create({
    data: {
      name,
      active,
      Creator: { connect: { id: accountId } },
      DeviceContext: { connect: { id: deviceContextId } },
    },
  });
};

export const getConfigSnapshotById = async (body: IdDto) => {
  const { id } = body;

  return await prisma.configSnapshot.findUnique({
    where: { id },
    include: {
      DataloggerConfig: {
        where: { active: true, archivedAt: null },
        select: { config: true, name: true, dataloggerDriverId: true },
      },
      SensorConfig: {
        where: { active: true, archivedAt: null },
        select: { config: true, name: true, sensorDriverId: true, id: true },
      },
    },
  });
};

export const getConfigSnapshots = async (
  body: QueryConfigSnapshotDto,
) => {
  const { accountId, orderBy, limit, offset, order, search, active, name } =
    body;

  return await prisma.configSnapshot.findMany({
    where: {
      active,
      archivedAt: null,
      creatorId: accountId,
      name: name || { contains: search },
    },
    include: {
      DataloggerConfig: {
        where: { archivedAt: null },
        select: { config: true, id: true },
      },
      SensorConfig: {
        where: { archivedAt: null },
        select: { config: true, name: true, id: true },
      },
    },
    take: limit,
    skip: offset,
    orderBy: orderBy ? { [orderBy]: order } : undefined,
  });
};

export const getConfigSnapshotLibraryConfig = async (
  query: QueryConfigSnapshotLibraryConfigDto,
) => {
  const {
    search,
    limit,
    offset,
    order,
    orderBy,
    isPublic,
    accountId,
    name,
    author,
  } = query;
  return await prisma.systemLibraryConfig.findMany({
    where: {
      name: name || { contains: search },
      archivedAt: null,
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

export const getConfigSnapshotLibraryConfigById = async (query: IdDto) => {
  const { id } = query;
  return await prisma.systemLibraryConfig.findUnique({
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
      SystemLibraryConfigVersion: {
        where: {
          archivedAt: null,
        },
        orderBy: { version: "desc" },
        select: {
          version: true,
          description: true,
          ConfigSnapshot: {
            select: {
              id: true,
              name: true,
              DataloggerConfig: {
                select: { config: true, id: true },
              },
              SensorConfig: {
                select: { name: true, config: true, id: true },
              },
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

export const saveConfigSnapshot = async (
  body: {
    name: string;
    configSnapshot: ConfigSnapshotDto;
    accountId: string;
  },
) => {
  const {
    name,
    configSnapshot: { SensorConfig, DataloggerConfig },
    accountId,
  } = body;

  return await prisma.configSnapshot.create({
    data: {
      name,
      Creator: { connect: { id: accountId } },
      active: false,
      ...(DataloggerConfig.length && {
        DataloggerConfig: {
          create: {
            name: DataloggerConfig[0].name,
            config: DataloggerConfig[0].config as InputJsonValue,
            active: false,
            creatorId: accountId,
            dataloggerDriverId: DataloggerConfig[0].dataloggerDriverId,
          },
        },
      }),
      ...(SensorConfig.length && {
        SensorConfig: {
          createMany: {
            data: SensorConfig.map((s) => ({
              name: s.name,
              config: s.config as InputJsonValue,
              active: false,
              creatorId: accountId,
              sensorDriverId: s.sensorDriverId,
            })),
          },
        },
      }),
    },
  });
};

export const createConfigSnapshotLibraryConfig = async (body: {
  name: string;
  accountId: string;
  description?: string;
  configSnapshot: ConfigSnapshotDto;
}) => {
  const {
    name,
    accountId,
    description,
    configSnapshot: { SensorConfig, DataloggerConfig },
  } = body;

  return await prisma.systemLibraryConfig.create({
    data: {
      name,
      description,
      Creator: { connect: { id: accountId } },
      SystemLibraryConfigVersion: {
        create: {
          version: 1,
          Creator: { connect: { id: accountId } },
          ConfigSnapshot: {
            create: {
              name: `v1`,
              Creator: { connect: { id: accountId } },
              active: false,
              ...(DataloggerConfig.length && {
                DataloggerConfig: {
                  create: {
                    name: DataloggerConfig[0].name,
                    config: DataloggerConfig[0].config as InputJsonValue,
                    active: false,
                    creatorId: accountId,
                    dataloggerDriverId: DataloggerConfig[0].dataloggerDriverId,
                  },
                },
              }),
              ...(SensorConfig.length && {
                SensorConfig: {
                  createMany: {
                    data: SensorConfig.map((s) => ({
                      name: s.name,
                      config: s.config as InputJsonValue,
                      active: false,
                      creatorId: accountId,
                      sensorDriverId: s.sensorDriverId,
                    })),
                  },
                },
              }),
            },
          },
        },
      },
    },
  });
};

export const createNewConfigSnapshotLibraryConfigVersion = async (body: {
  accountId: string;
  version: number;
  configSnapshotLibraryConfigId: string;
  configSnapshot: ConfigSnapshotDto;
  description?: string;
}) => {
  const {
    accountId,
    version,
    configSnapshot: { DataloggerConfig, SensorConfig },
    configSnapshotLibraryConfigId,
    description,
  } = body;

  return await prisma.systemLibraryConfigVersion.create({
    data: {
      version,
      Creator: { connect: { id: accountId } },
      description,
      SystemLibraryConfig: { connect: { id: configSnapshotLibraryConfigId } },
      ConfigSnapshot: {
        create: {
          name: `v${version}`,
          Creator: { connect: { id: accountId } },
          active: false,
          ...(DataloggerConfig.length && {
            DataloggerConfig: {
              create: {
                name: DataloggerConfig[0].name,
                config: DataloggerConfig[0].config as InputJsonValue,
                active: false,
                creatorId: accountId,
                dataloggerDriverId: DataloggerConfig[0].dataloggerDriverId,
              },
            },
          }),
          ...(SensorConfig.length && {
            SensorConfig: {
              createMany: {
                data: SensorConfig.map((s) => ({
                  name: s.name,
                  config: s.config as InputJsonValue,
                  active: false,
                  creatorId: accountId,
                  sensorDriverId: s.sensorDriverId,
                })),
              },
            },
          }),
        },
      },
    },
  });
};

export const overwriteActiveConfigSnapshot = async (
  body: {
    configSnapshotId: string;
    sensorConfigIds: Array<string>;
    dataloggerConfigId?: string;
    accountId: string;
    createdAt: Date;
  },
) => {
  const {
    configSnapshotId,
    sensorConfigIds,
    dataloggerConfigId,
    accountId,
    createdAt,
  } = body;

  return await prisma.$transaction(async (trx) => {
    await trx.dataloggerConfig.updateMany({
      where: { configSnapshotId, active: true, deactivatedAt: null },
      data: { active: false, deactivatedAt: createdAt },
    });

    await trx.sensorConfig.updateMany({
      where: { configSnapshotId, active: true, deactivatedAt: null },
      data: { active: false, deactivatedAt: createdAt },
    });

    if (dataloggerConfigId) {
      const dataloggerConfig = await trx.dataloggerConfig.findUnique({
        where: { id: dataloggerConfigId },
      });

      if (!dataloggerConfig) {
        throw new HttpException(422, "invalid datalogger config id received");
      }

      const { config, dataloggerDriverId } = dataloggerConfig;

      await trx.dataloggerConfig.create({
        data: {
          name: "datalogger",
          config: config as Prisma.JsonObject,
          active: true,
          createdAt,
          DataloggerDriver: { connect: { id: dataloggerDriverId } },
          Creator: { connect: { id: accountId } },
          ConfigSnapshot: { connect: { id: configSnapshotId } },
        },
      });
    }

    if (sensorConfigIds.length) {
      const sensorConfigs = await trx.sensorConfig.findMany({
        where: { id: { in: sensorConfigIds } },
      });

      if (sensorConfigs.length !== sensorConfigIds.length) {
        throw new HttpException(422, "invalid sensor config id received");
      }

      await trx.sensorConfig.createMany({
        data: sensorConfigs.map((s) => ({
          name: s.name,
          config: s.config as Prisma.JsonObject,
          active: true,
          createdAt,
          sensorDriverId: s.sensorDriverId,
          creatorId: accountId,
          configSnapshotId,
        })),
      });
    }
  });
};

export const updateLibraryConfig = async (body: UpdateLibraryConfigDto) => {
  const { isPublic, id } = body;
  await prisma.systemLibraryConfig.update({
    where: { id },
    data: { isPublic },
  });
};
