import prisma from "../infra/prisma.ts";

const library = {
  select: { creatorId: true, isPublic: true, archivedAt: true },
};

export const getSensorLibraryConfigVersionSource = async (id: string) =>
  await prisma.sensorLibraryConfigVersion.findUnique({
    where: { id },
    select: {
      id: true,
      archivedAt: true,
      SensorLibraryConfig: library,
      SensorConfig: { select: { config: true } },
    },
  });

export const getDataloggerLibraryConfigVersionSource = async (id: string) =>
  await prisma.dataloggerLibraryConfigVersion.findUnique({
    where: { id },
    select: {
      id: true,
      archivedAt: true,
      DataloggerLibraryConfig: library,
    },
  });

export const getSystemLibraryConfigVersionSource = async (id: string) =>
  await prisma.systemLibraryConfigVersion.findUnique({
    where: { id },
    select: {
      id: true,
      archivedAt: true,
      SystemLibraryConfig: library,
      ConfigSnapshot: {
        select: {
          SensorConfig: {
            where: { archivedAt: null },
            select: { name: true, config: true },
          },
        },
      },
    },
  });
