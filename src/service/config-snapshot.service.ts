import {
  assertLibraryUpdateAllowed,
  assertMatchesDriver,
  requireDriver,
} from "./utils/library-config.ts";
import { isDeepStrictEqual } from "node:util";
import {
  ConfigSnapshotDto,
  CreateConfigSnapshotLibraryConfigDto,
  CreateConfigSnapshotLibraryConfigVersionDto,
  QueryActiveConfigDto,
  QueryConfigHistoryDto,
  QueryConfigSnapshotDto,
  QueryConfigSnapshotLibraryConfigDto,
  SaveConfigSnapshotDto,
  UpdateLibraryConfigDto,
} from "../types/config-snapshot.types.ts";
import { AccountIdDto, IdDto, IdorNameDto } from "../types/generic.types.ts";
import * as configSnapshotRepository from "../repository/config-snapshot.repository.ts";
import * as sensorRepository from "../repository/sensor.repository.ts";
import * as dataloggerRepository from "../repository/datalogger.repository.ts";
import { getDeviceContext } from "./device-context.service.ts";
import { HttpException } from "../utils/http-exception.ts";
import { isUniqueConstraintError } from "../utils/prisma-errors.ts";
import { getDataloggerConfigHistory } from "./datalogger.service.ts";
import { getSensorConfigHistory } from "./sensor.service.ts";
import { authDeviceCheck } from "./device.service.ts";

const getConfigSnapshotById = async (query: IdDto) => {
  return await configSnapshotRepository.getConfigSnapshotById(query);
};

const getActiveConfigSnapshotId = async (query: QueryActiveConfigDto) => {
  const { deviceId, accountId, contextId } = query;
  const deviceContext = await getDeviceContext({
    deviceId,
    contextId,
    accountId,
  });

  if (!deviceContext) {
    throw new HttpException(422, "device context not found");
  }

  const { configSnapshotId } = deviceContext;
  return configSnapshotId;
};

const getActiveConfigSnapshot = async (query: QueryActiveConfigDto) => {
  const configSnapshotId = await getActiveConfigSnapshotId(query);
  const configSnapshot = await getConfigSnapshotById({ id: configSnapshotId });

  if (!configSnapshot) {
    throw new HttpException(404, "no active config snapshot found");
  }

  return configSnapshot;
};

export const getConfigSnapshots = async (query: QueryConfigSnapshotDto) => {
  return await configSnapshotRepository.getConfigSnapshots(query);
};

type SourceVersion = {
  id: string;
  version: number;
  library: { id: string; name: string; latestVersion: number | null };
  /** The version's settings for this row. */
  config: unknown;
};

/** Settings that differ between a device row and the version it came from. */
const changedSettings = (device: unknown, library: unknown) => {
  const a = (device && typeof device === "object" ? device : {}) as Record<
    string,
    unknown
  >;
  const b = (library && typeof library === "object" ? library : {}) as Record<
    string,
    unknown
  >;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].filter((key) => !isDeepStrictEqual(a[key], b[key])).length;
};

/**
 * The library version a device config row came from, for "Based on <name>
 * v3, 2 settings changed, v4 available". `null` when it was set by hand,
 * from a saved snapshot, or before sources were recorded.
 */
const configSourceOf = (
  kind: "sensor" | "datalogger" | "system",
  version: SourceVersion | null,
  deviceConfig: unknown,
) => {
  if (!version) return null;
  const { latestVersion } = version.library;
  return {
    kind,
    versionId: version.id,
    version: version.version,
    libraryConfigId: version.library.id,
    name: version.library.name,
    latestVersion,
    updateAvailable: latestVersion !== null && latestVersion > version.version,
    changedSettings: changedSettings(deviceConfig, version.config),
  };
};

type SystemSource = {
  id: string;
  version: number;
  SystemLibraryConfig: {
    id: string;
    name: string;
    SystemLibraryConfigVersion: { version: number }[];
  };
  ConfigSnapshot: {
    DataloggerConfig: { config: unknown }[];
    SensorConfig: { name: string; config: unknown }[];
  };
};

const fromSystem = (
  system: SystemSource,
  pick: (snapshot: SystemSource["ConfigSnapshot"]) => unknown,
): SourceVersion => ({
  id: system.id,
  version: system.version,
  library: {
    id: system.SystemLibraryConfig.id,
    name: system.SystemLibraryConfig.name,
    latestVersion:
      system.SystemLibraryConfig.SystemLibraryConfigVersion[0]?.version ?? null,
  },
  config: pick(system.ConfigSnapshot),
});

export const getActiveConfig = async (query: QueryActiveConfigDto) => {
  const configSnapshot = await getActiveConfigSnapshot(query);
  const { DataloggerConfig, SensorConfig } = configSnapshot;

  const datalogger = DataloggerConfig[0];
  const dataloggerOwn = datalogger?.SourceDataloggerLibraryConfigVersion;
  const dataloggerSystem = datalogger?.SourceSystemLibraryConfigVersion;

  return {
    dataloggerConfig: {
      config: datalogger?.config || {},
      /** The driver the datalogger config is recorded with. */
      dataloggerDriverId: datalogger?.dataloggerDriverId ?? null,
      source: dataloggerOwn
        ? configSourceOf("datalogger", {
          id: dataloggerOwn.id,
          version: dataloggerOwn.version,
          library: {
            id: dataloggerOwn.DataloggerLibraryConfig.id,
            name: dataloggerOwn.DataloggerLibraryConfig.name,
            latestVersion: dataloggerOwn.DataloggerLibraryConfig
              .DataloggerLibraryConfigVersion[0]?.version ?? null,
          },
          config: dataloggerOwn.DataloggerConfig.config,
        }, datalogger.config)
        : dataloggerSystem
        ? configSourceOf(
          "system",
          fromSystem(
            dataloggerSystem,
            (snapshot) => snapshot.DataloggerConfig[0]?.config,
          ),
          datalogger.config,
        )
        : null,
    },
    sensorConfig: SensorConfig.map((s) => {
      const own = s.SourceSensorLibraryConfigVersion;
      const system = s.SourceSystemLibraryConfigVersion;
      return {
        config: s.config,
        name: s.name,
        id: s.id,
        sensorDriverId: s.sensorDriverId,
        source: own
          ? configSourceOf("sensor", {
            id: own.id,
            version: own.version,
            library: {
              id: own.SensorLibraryConfig.id,
              name: own.SensorLibraryConfig.name,
              latestVersion:
                own.SensorLibraryConfig.SensorLibraryConfigVersion[0]
                  ?.version ?? null,
            },
            config: own.SensorConfig.config,
          }, s.config)
          : system
          ? configSourceOf(
            "system",
            fromSystem(
              system,
              (snapshot) =>
                snapshot.SensorConfig.find((entry) => entry.name === s.name)
                  ?.config,
            ),
            s.config,
          )
          : null,
      };
    }),
  };
};

export const getConfigSnapshotHistory = async (
  query: QueryConfigHistoryDto,
) => {
  await authDeviceCheck({
    deviceIdentifier: query.deviceIdentifier,
    accountId: query.accountId,
    relation: "can_write",
  });
  const dataloggerConfigs = await getDataloggerConfigHistory({
    ...query,
    deviceValidated: true,
  });
  const sensorConfigs = await getSensorConfigHistory({
    ...query,
    deviceValidated: true,
  });

  return {
    dataloggerConfigs,
    sensorConfigs,
  };
};

export const getConfigSnapshotLibraryConfig = async (
  query: QueryConfigSnapshotLibraryConfigDto,
) => {
  return await configSnapshotRepository.getConfigSnapshotLibraryConfig(query);
};

export const getConfigSnapshotLibraryConfigById = async (
  query: IdDto & AccountIdDto & { write?: boolean },
) => {
  const { accountId, id, write } = query;
  const configSnapshotLibraryConfig = await configSnapshotRepository
    .getConfigSnapshotLibraryConfigById({ id });
  if (write) {
    if (
      !configSnapshotLibraryConfig ||
      configSnapshotLibraryConfig.creatorId !== accountId
    ) {
      throw new HttpException(404, "library config not found");
    }
  } else {
    if (
      !configSnapshotLibraryConfig ||
      (configSnapshotLibraryConfig.creatorId !== accountId &&
        !configSnapshotLibraryConfig.isPublic)
    ) {
      throw new HttpException(404, "library config not found");
    }
  }
  return configSnapshotLibraryConfig;
};

export const saveConfigSnapshot = async (body: SaveConfigSnapshotDto) => {
  const { deviceId, contextId, accountId, name } = body;

  const existingConfiSnapshot = await getConfigSnapshots({
    accountId,
    name,
  });

  if (existingConfiSnapshot.length) {
    throw new HttpException(409, `config snapshot with ${name} already exists`);
  }

  const configSnapshot = await getActiveConfigSnapshot({
    deviceId,
    contextId,
    accountId,
  });

  if (
    !configSnapshot.DataloggerConfig.length &&
    !configSnapshot.SensorConfig.length
  ) {
    throw new HttpException(409, `no active config snapshot found`);
  }

  try {
    return await configSnapshotRepository.saveConfigSnapshot({
      name,
      configSnapshot,
      accountId,
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new HttpException(
        409,
        `config snapshot with ${name} already exists`,
      );
    }
    throw error;
  }
};

/**
 * A whole-device library config's snapshot: the datalogger and each sensor
 * with the driver the client chose for it, each checked against that
 * driver's schema (as device uploads are).
 */
const snapshotWithDrivers = async (body: {
  datalogger: Record<string, unknown>;
  dataloggerDriverId: string;
  sensors:
    ({ name: string; sensorDriverId: string } & Record<string, unknown>)[];
}): Promise<ConfigSnapshotDto> => {
  const { datalogger, dataloggerDriverId, sensors } = body;
  const dataloggerDriver = requireDriver(
    await dataloggerRepository.getDataloggerDriverById({
      id: dataloggerDriverId,
    }),
    "datalogger",
  );
  assertMatchesDriver(dataloggerDriver, datalogger, "datalogger");

  const sensorDrivers = new Map<string, { id: string; validation: unknown }>();
  const SensorConfig = [];
  for (const { name, sensorDriverId, ...config } of sensors) {
    let driver = sensorDrivers.get(sensorDriverId);
    if (!driver) {
      driver = requireDriver(
        await sensorRepository.getSensorDriverById({ id: sensorDriverId }),
        "sensor",
      );
      sensorDrivers.set(sensorDriverId, driver);
    }
    assertMatchesDriver(driver, config, "sensor");
    SensorConfig.push({ name, config, sensorDriverId: driver.id });
  }

  return {
    DataloggerConfig: [
      {
        name: "datalogger",
        config: datalogger,
        dataloggerDriverId: dataloggerDriver.id,
      },
    ],
    SensorConfig,
  } as ConfigSnapshotDto;
};

export const createConfigSnapshotLibraryConfig = async (
  body: CreateConfigSnapshotLibraryConfigDto,
) => {
  const { name, description, firmwareVersion, accountId } = body;

  // chack if name exists
  const exisitingLibraryConfig = await getConfigSnapshotLibraryConfig({
    name,
    accountId,
  });

  if (exisitingLibraryConfig.length) {
    throw new HttpException(409, `${name} already exists`);
  }

  const configSnapshot = await snapshotWithDrivers(body);

  try {
    return await configSnapshotRepository.createConfigSnapshotLibraryConfig({
      name,
      description,
      firmwareVersion,
      accountId,
      configSnapshot,
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new HttpException(409, `${name} already exists`);
    }
    throw error;
  }
};

export const createNewConfigSnapshotLibraryConfigVersion = async (
  body: CreateConfigSnapshotLibraryConfigVersionDto,
) => {
  const { id, accountId, description, firmwareVersion } = body;

  const configSnapshotLibraryConfig = await getConfigSnapshotLibraryConfigById({
    id,
    accountId,
    write: true,
  });

  const configSnapshot = await snapshotWithDrivers(body);

  const configSnapshotLibraryConfigVersions =
    configSnapshotLibraryConfig.SystemLibraryConfigVersion;

  if (!configSnapshotLibraryConfigVersions.length) {
    try {
      return await configSnapshotRepository
        .createNewConfigSnapshotLibraryConfigVersion(
          {
            accountId,
            description,
            firmwareVersion,
            version: 1,
            configSnapshot,
            configSnapshotLibraryConfigId: id,
          },
        );
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new HttpException(409, "version already published, retry");
      }
      throw error;
    }
  } else {
    const latestConfigVersion = configSnapshotLibraryConfigVersions[0];

    const {
      ConfigSnapshot: {
        DataloggerConfig: oldDataloggerConfig,
        SensorConfig: oldSensorConfig,
      },
    } = latestConfigVersion;

    const {
      DataloggerConfig: newDataloggerConfig,
      SensorConfig: newSensorConfig,
    } = configSnapshot;

    const configsEqual = isDeepStrictEqual(
      oldDataloggerConfig,
      newDataloggerConfig.map((d) => ({ config: d.config })),
    ) &&
      isDeepStrictEqual(
        oldSensorConfig,
        newSensorConfig.map((s) => ({ config: s.config, name: s.name })),
      );

    if (configsEqual) {
      throw new HttpException(
        409,
        `config snapshot provided is already published as latest version`,
      );
    }

    try {
      return await configSnapshotRepository
        .createNewConfigSnapshotLibraryConfigVersion(
          {
            accountId,
            description,
            firmwareVersion,
            version: latestConfigVersion.version + 1,
            configSnapshot,
            configSnapshotLibraryConfigId: id,
          },
        );
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new HttpException(409, "version already published, retry");
      }
      throw error;
    }
  }
};

export const updateLibraryConfig = async (body: UpdateLibraryConfigDto) => {
  const { id, accountId } = body;
  const libraryConfig = await getConfigSnapshotLibraryConfigById({
    id,
    accountId,
    write: true,
  });
  assertLibraryUpdateAllowed(libraryConfig, body);

  try {
    return await configSnapshotRepository.updateLibraryConfig(body);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new HttpException(409, `${body.name} already exists`);
    }
    throw error;
  }
};

export const deleteConfigSnapshotLibraryConfig = async (
  requestBody: IdorNameDto & AccountIdDto,
) => {
  const { accountId } = requestBody;
  let libraryId;

  if ("id" in requestBody) {
    await getConfigSnapshotLibraryConfigById({
      id: requestBody.id,
      accountId,
    });
    libraryId = requestBody.id;
  } else {
    const config = await getConfigSnapshotLibraryConfig({
      name: requestBody.name,
      accountId,
    });

    if (!config.length) {
      throw new HttpException(404, "library config not found");
    }
    libraryId = config[0].id;
  }

  return await configSnapshotRepository.deleteConfigSnapshotLibraryConfig({
    id: libraryId,
  });
};

/** Rename one of your saved snapshots. Names are unique among yours. */
export const renameSavedSnapshot = async (
  body: { id: string; accountId: string; name: string },
) => {
  try {
    const count = await configSnapshotRepository.renameSavedSnapshot(body);
    if (!count) throw new HttpException(404, "saved config not found");
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new HttpException(
        409,
        `config snapshot with ${body.name} already exists`,
      );
    }
    throw error;
  }
  return { id: body.id, name: body.name };
};

/** Delete (archive) one of your saved snapshots. */
export const deleteSavedSnapshot = async (
  body: { id: string; accountId: string },
) => {
  const count = await configSnapshotRepository.archiveSavedSnapshot(body);
  if (!count) throw new HttpException(404, "saved config not found");
};
