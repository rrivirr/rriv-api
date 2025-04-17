import { isDeepStrictEqual } from "node:util";
import {
  CreateConfigSnapshotLibraryConfigDto,
  CreateConfigSnapshotLibraryConfigVersionDto,
  QueryActiveConfigDto,
  QueryConfigSnapshotDto,
  QueryConfigSnapshotHistoryDto,
  QueryConfigSnapshotLibraryConfigDto,
  SaveConfigSnapshotDto,
} from "../types/config-snapshot.types.ts";
import { IdDto } from "../types/generic.types.ts";
import * as configSnapshotRepository from "../repository/config-snapshot.repository.ts";
import { getDeviceContext } from "./device-context.service.ts";
import { HttpException } from "../utils/http-exception.ts";
import { getDataloggerConfig } from "./datalogger.service.ts";
import { getSensorConfig } from "../repository/sensor.repository.ts";
import { getDataloggerConfigChanges } from "./utils/get-datalogger-config-changes.ts";
import { getSensorConfigChanges } from "./utils/get-sensor-config-changes.ts";

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

export const getActiveConfig = async (
  query: QueryActiveConfigDto,
) => {
  const configSnapshot = await getActiveConfigSnapshot(query);
  const { DataloggerConfig, SensorConfig } = configSnapshot;

  return {
    dataloggerConfig: { config: DataloggerConfig[0]?.config || {} },
    sensorConfig: SensorConfig.map((s) => ({ config: s.config, name: s.name })),
  };
};

export const getConfigSnapshotHistory = async (
  query: QueryConfigSnapshotHistoryDto,
) => {
  const { contextId, deviceId, limit, offset, order, accountId } = query;
  const configSnapshotId = await getActiveConfigSnapshotId({
    accountId,
    deviceId,
    contextId,
  });

  const dataloggerConfigs = await getDataloggerConfig({
    configSnapshotId,
    accountId,
    limit,
    offset,
    order,
  });
  const sensorConfigs = await getSensorConfig({
    accountId,
    configSnapshotId,
    limit,
    offset,
    order,
  });

  const dataloggerConfigWithDifference = getDataloggerConfigChanges(
    dataloggerConfigs,
  );
  const sensorConfigWithDifference = getSensorConfigChanges(sensorConfigs);

  return {
    dataloggerConfigs: dataloggerConfigWithDifference,
    sensorConfigs: sensorConfigWithDifference,
  };
};

export const getConfigSnapshotLibraryConfig = async (
  query: QueryConfigSnapshotLibraryConfigDto,
) => {
  return await configSnapshotRepository.getConfigSnapshotLibraryConfig(query);
};

export const getConfigSnapshotLibraryConfigById = async (query: IdDto) => {
  return await configSnapshotRepository.getConfigSnapshotLibraryConfigById(
    query,
  );
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

  return await configSnapshotRepository.saveConfigSnapshot({
    name,
    configSnapshot,
    accountId,
  });
};

export const createConfigSnapshotLibraryConfig = async (
  body: CreateConfigSnapshotLibraryConfigDto,
) => {
  const { name, description, accountId } = body;

  // chack if name exists
  const exisitingLibraryConfig = await getConfigSnapshotLibraryConfig({
    name,
  });

  if (exisitingLibraryConfig.length) {
    throw new HttpException(409, `${name} already exists`);
  }

  if ("configSnapshotId" in body) {
    const { configSnapshotId } = body;
    const configSnapshot = await getConfigSnapshotById({
      id: configSnapshotId,
    });

    if (!configSnapshot) {
      throw new HttpException(404, "config snapshot not found");
    }

    return await configSnapshotRepository.createConfigSnapshotLibraryConfig({
      name,
      description,
      accountId,
      configSnapshot,
    });
  } else {
    const { deviceId, contextId, accountId } = body;

    const configSnapshot = await getActiveConfigSnapshot({
      deviceId,
      contextId,
      accountId,
    });

    return await configSnapshotRepository.createConfigSnapshotLibraryConfig({
      name,
      description,
      configSnapshot,
      accountId,
    });
  }
};

export const createNewConfigSnapshotLibraryConfigVersion = async (
  body: CreateConfigSnapshotLibraryConfigVersionDto,
) => {
  const { id, accountId, description } = body;

  const configSnapshotLibraryConfig = await getConfigSnapshotLibraryConfigById({
    id,
  });
  if (
    !configSnapshotLibraryConfig ||
    configSnapshotLibraryConfig.creatorId !== accountId
  ) {
    throw new HttpException(404, "datalogger library config not found");
  }

  let configSnapshot;

  if ("configSnapshotId" in body) {
    const { configSnapshotId } = body;

    configSnapshot = await getConfigSnapshotById({
      id: configSnapshotId,
    });

    if (!configSnapshot) {
      throw new HttpException(404, "config snapshot not found");
    }
  } else {
    const { deviceId, contextId } = body;

    configSnapshot = await getActiveConfigSnapshot({
      deviceId,
      contextId,
      accountId,
    });
  }

  const configSnapshotLibraryConfigVersions =
    configSnapshotLibraryConfig.SystemLibraryConfigVersion;

  if (!configSnapshotLibraryConfigVersions.length) {
    return await configSnapshotRepository
      .createNewConfigSnapshotLibraryConfigVersion({
        accountId,
        description,
        version: 1,
        configSnapshot,
        configSnapshotLibraryConfigId: id,
      });
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

    return await configSnapshotRepository
      .createNewConfigSnapshotLibraryConfigVersion({
        accountId,
        description,
        version: latestConfigVersion.version + 1,
        configSnapshot,
        configSnapshotLibraryConfigId: id,
      });
  }
};
