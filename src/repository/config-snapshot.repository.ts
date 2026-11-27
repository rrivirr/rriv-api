import prisma from "../infra/prisma.ts";
import {
  ConfigSnapshotDto,
  QueryConfigSnapshotDto,
  QueryConfigSnapshotLibraryConfigDto,
  UpdateLibraryConfigDto,
} from "../types/config-snapshot.types.ts";
import { IdDto } from "../types/generic.types.ts";
import { InputJsonValue } from "generated/internal/prismaNamespace.ts";
import { CONFIG_SNAPSHOT_KIND } from "../service/utils/constants.ts";

export const createConfigSnapshot = async (body: {
  name: string;
  accountId: string;
  active: boolean;
  deviceContextId: string;
}) => {
  const { name, accountId, active, deviceContextId } = body;
  return await prisma.configSnapshot.create({
    data: {
      name,
      kind: CONFIG_SNAPSHOT_KIND.DEVICE_ACTIVE,
      active,
      Creator: { connect: { id: accountId } },
      DeviceContext: { connect: { id: deviceContextId } },
    },
  });
};

const sourceSystemVersion = {
  select: {
    id: true,
    version: true,
    SystemLibraryConfig: {
      select: {
        id: true,
        name: true,
        SystemLibraryConfigVersion: {
          where: { archivedAt: null },
          orderBy: { version: "desc" },
          take: 1,
          select: { version: true },
        },
      },
    },
    ConfigSnapshot: {
      select: {
        DataloggerConfig: {
          where: { archivedAt: null },
          select: { config: true },
        },
        SensorConfig: {
          where: { archivedAt: null },
          select: { name: true, config: true },
        },
      },
    },
  },
} as const;

export const getConfigSnapshotById = async (body: IdDto) => {
  const { id } = body;

  return await prisma.configSnapshot.findUnique({
    where: { id },
    include: {
      DataloggerConfig: {
        where: { active: true, archivedAt: null },
        select: {
          config: true,
          name: true,
          dataloggerDriverId: true,
          SourceDataloggerLibraryConfigVersion: {
            select: {
              id: true,
              version: true,
              DataloggerConfig: { select: { config: true } },
              DataloggerLibraryConfig: {
                select: {
                  id: true,
                  name: true,
                  DataloggerLibraryConfigVersion: {
                    where: { archivedAt: null },
                    orderBy: { version: "desc" },
                    take: 1,
                    select: { version: true },
                  },
                },
              },
            },
          },
          SourceSystemLibraryConfigVersion: sourceSystemVersion,
        },
        orderBy: { createdAt: "asc" },
      },
      SensorConfig: {
        where: { active: true, archivedAt: null },
        select: {
          config: true,
          name: true,
          sensorDriverId: true,
          id: true,
          SourceSensorLibraryConfigVersion: {
            select: {
              id: true,
              version: true,
              SensorConfig: { select: { config: true } },
              SensorLibraryConfig: {
                select: {
                  id: true,
                  name: true,
                  SensorLibraryConfigVersion: {
                    where: { archivedAt: null },
                    orderBy: { version: "desc" },
                    take: 1,
                    select: { version: true },
                  },
                },
              },
            },
          },
          SourceSystemLibraryConfigVersion: sourceSystemVersion,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
};

export const getActiveConfigSnapshotByDeviceContext = async (body: {
  deviceContextId: string;
}) => {
  return await prisma.configSnapshot.findFirst({
    where: {
      deviceContextId: body.deviceContextId,
      active: true,
      archivedAt: null,
    },
    orderBy: { createdAt: "asc" },
  });
};

export const getConfigSnapshots = async (body: QueryConfigSnapshotDto) => {
  const { accountId, orderBy, limit, offset, order, search, active, name, id } =
    body;

  return await prisma.configSnapshot.findMany({
    where: {
      id,
      kind: CONFIG_SNAPSHOT_KIND.SAVED,
      active,
      archivedAt: null,
      creatorId: accountId,
      name: name || { contains: search },
    },
    include: {
      DataloggerConfig: {
        where: { archivedAt: null },
        select: { config: true, id: true, dataloggerDriverId: true },
      },
      SensorConfig: {
        where: { archivedAt: null },
        select: { config: true, name: true, id: true, sensorDriverId: true },
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
    isOfficial,
  } = query;
  return await prisma.systemLibraryConfig.findMany({
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
          id: true,
          version: true,
          firmwareVersion: true,
          description: true,
          ConfigSnapshot: {
            select: {
              id: true,
              name: true,
              DataloggerConfig: {
                select: { config: true, id: true, dataloggerDriverId: true },
              },
              SensorConfig: {
                select: {
                  name: true,
                  config: true,
                  id: true,
                  sensorDriverId: true,
                },
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

export const saveConfigSnapshot = async (body: {
  name: string;
  configSnapshot: Pick<ConfigSnapshotDto, "SensorConfig" | "DataloggerConfig">;
  accountId: string;
}) => {
  const {
    name,
    configSnapshot: { SensorConfig, DataloggerConfig },
    accountId,
  } = body;

  return await prisma.configSnapshot.create({
    data: {
      name,
      kind: CONFIG_SNAPSHOT_KIND.SAVED,
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
  firmwareVersion?: string;
  configSnapshot: ConfigSnapshotDto;
}) => {
  const {
    name,
    accountId,
    description,
    firmwareVersion,
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
          firmwareVersion,
          Creator: { connect: { id: accountId } },
          ConfigSnapshot: {
            create: {
              name: `v1`,
              kind: CONFIG_SNAPSHOT_KIND.LIBRARY,
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
  firmwareVersion?: string;
}) => {
  const {
    accountId,
    version,
    firmwareVersion,
    configSnapshot: { DataloggerConfig, SensorConfig },
    configSnapshotLibraryConfigId,
    description,
  } = body;

  return await prisma.systemLibraryConfigVersion.create({
    data: {
      version,
      firmwareVersion,
      Creator: { connect: { id: accountId } },
      description,
      SystemLibraryConfig: { connect: { id: configSnapshotLibraryConfigId } },
      ConfigSnapshot: {
        create: {
          name: `v${version}`,
          kind: CONFIG_SNAPSHOT_KIND.LIBRARY,
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

export const updateLibraryConfig = async (body: UpdateLibraryConfigDto) => {
  const { isPublic, name, description, id } = body;
  return await prisma.systemLibraryConfig.update({
    where: { id },
    data: { isPublic, name, description },
  });
};

export const deleteConfigSnapshotLibraryConfig = async (body: IdDto) => {
  const { id } = body;

  return await prisma.$transaction(async (trx) => {
    const libraryConfigVersions = await trx.systemLibraryConfigVersion
      .updateManyAndReturn({
        where: { systemLibraryConfigId: id },
        data: { archivedAt: new Date() },
        select: { configSnapshotId: true },
      });

    await trx.configSnapshot.updateMany({
      where: {
        id: { in: libraryConfigVersions.map((l) => l.configSnapshotId) },
      },
      data: { archivedAt: new Date() },
    });

    await trx.dataloggerConfig.updateMany({
      where: {
        configSnapshotId: {
          in: libraryConfigVersions.map((l) => l.configSnapshotId),
        },
      },
      data: { archivedAt: new Date() },
    });

    await trx.sensorConfig.updateMany({
      where: {
        configSnapshotId: {
          in: libraryConfigVersions.map((l) => l.configSnapshotId),
        },
      },
      data: { archivedAt: new Date() },
    });

    return await trx.systemLibraryConfig.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
  });
};

const savedSnapshotWhere = (id: string, accountId: string) => ({
  id,
  creatorId: accountId,
  kind: CONFIG_SNAPSHOT_KIND.SAVED,
  archivedAt: null,
});

export const renameSavedSnapshot = async (body: {
  id: string;
  accountId: string;
  name: string;
}) => {
  const { id, accountId, name } = body;
  const { count } = await prisma.configSnapshot.updateMany({
    where: savedSnapshotWhere(id, accountId),
    data: { name },
  });
  return count;
};

/** Archive a saved snapshot and its rows (kept, hidden). */
export const archiveSavedSnapshot = async (body: {
  id: string;
  accountId: string;
}) => {
  const { id, accountId } = body;
  const archivedAt = new Date();
  return await prisma.$transaction(async (trx) => {
    const { count } = await trx.configSnapshot.updateMany({
      where: savedSnapshotWhere(id, accountId),
      data: { archivedAt },
    });
    if (!count) return 0;
    await trx.dataloggerConfig.updateMany({
      where: { configSnapshotId: id, archivedAt: null },
      data: { archivedAt },
    });
    await trx.sensorConfig.updateMany({
      where: { configSnapshotId: id, archivedAt: null },
      data: { archivedAt },
    });
    return count;
  });
};
