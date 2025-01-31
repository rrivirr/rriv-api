// @ts-types="generated/index.d.ts"
import { PrismaClient } from "generated/index.js";

export default new PrismaClient({
  omit: {
    context: {
      archivedAt: true,
      accountId: true,
    },
    device: {
      archivedAt: true,
    },
    sensorConfig: {
      archivedAt: true,
      creatorId: true,
    },
    sensorDriver: {
      archivedAt: true,
      creatorId: true,
    },
    sensorLibraryConfig: {
      archivedAt: true,
      creatorId: true,
    },
    sensorLibraryConfigVersion: {
      archivedAt: true,
      creatorId: true,
    },
    dataloggerConfig: {
      archivedAt: true,
      creatorId: true,
    },
    dataloggerDriver: {
      archivedAt: true,
      creatorId: true,
    },
    dataloggerLibraryConfig: {
      archivedAt: true,
      creatorId: true,
    },
    dataloggerLibraryConfigVersion: {
      archivedAt: true,
      creatorId: true,
    },
  },
});
