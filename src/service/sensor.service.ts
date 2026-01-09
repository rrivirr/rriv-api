import { Ajv, AnySchema } from "ajv";
import {
  CreateSensorConfigDto,
  CreateSensorDriverDto,
  CreateSensorLibraryConfigDto,
  CreateSensorLibraryConfigVersionDto,
  QuerySensorConfigDto,
  QuerySensorDriverDto,
  QuerySensorLibraryConfigDto,
} from "../types/sensor.types.ts";
import * as sensorRepository from "../repository/sensor.repository.ts";
import { HttpException } from "../utils/http-exception.ts";
import { AccountIdDto, IdDto } from "../types/generic.types.ts";
import { getDeviceContext } from "./device-context.service.ts";
import { isDeepStrictEqual } from "node:util";
import {
  QueryConfigHistoryDto,
  UpdateLibraryConfigDto,
} from "../types/config-snapshot.types.ts";
import { getSensorConfigChanges } from "./utils/get-sensor-config-changes.ts";
import { validateDevice } from "./utils/validate-device.ts";
import { JsonObject } from "generated/runtime/library.d.ts";

export const getSensorDriver = async (query: QuerySensorDriverDto) => {
  return await sensorRepository.getSensorDriver(query);
};

export const getSensorLibraryConfig = async (
  query: QuerySensorLibraryConfigDto,
) => {
  return await sensorRepository.getSensorLibraryConfig(query);
};

export const getSensorLibraryConfigById = async (
  query: IdDto & AccountIdDto & { write?: boolean },
) => {
  const { accountId, id, write } = query;
  const sensorLibraryConfig = await sensorRepository
    .getSensorLibraryConfigById({ id });
  if (write) {
    if (
      !sensorLibraryConfig ||
      sensorLibraryConfig.creatorId !== accountId
    ) {
      throw new HttpException(404, "library config not found");
    }
  } else {
    if (
      !sensorLibraryConfig ||
      (sensorLibraryConfig.creatorId !== accountId &&
        !sensorLibraryConfig.isPublic)
    ) {
      throw new HttpException(404, "library config not found");
    }
  }
  return sensorLibraryConfig;
};

const getSensorConfig = async (
  query: QuerySensorConfigDto | QueryConfigHistoryDto,
) => {
  return await sensorRepository.getSensorConfig(query);
};

const getSensorDriverById = async (query: IdDto) => {
  return await sensorRepository.getSensorDriverById(query);
};

const getSensorConfigById = async (query: IdDto) => {
  return await sensorRepository.getSensorConfigById(query);
};

export const createSensorDriver = async (
  requestBody: CreateSensorDriverDto,
) => {
  const { name, accountId, validation } = requestBody;

  const existingSensorConfig = await getSensorDriver({ name });
  if (existingSensorConfig.length) {
    throw new HttpException(409, `${name} already exists`);
  }

  return await sensorRepository.createSensorDriver({
    name,
    accountId,
    validation,
  });
};

export const createSensorConfig = async (
  requestBody: CreateSensorConfigDto,
) => {
  const {
    name,
    accountId,
    sensorDriverId,
    config,
    deviceId,
    contextId,
    singlePropertyChange,
  } = requestBody;

  const deviceContext = await getDeviceContext({
    contextId,
    deviceId,
    accountId,
  });

  if (!deviceContext) {
    throw new HttpException(422, "device context not found");
  }
  const { configSnapshotId } = deviceContext;

  const existingSensorConfig = await getSensorConfig({
    name,
    accountId,
    configSnapshotId,
    active: true,
  });

  let sensorConfigToDeactivateId: string | undefined;
  let existingConfig;

  if (existingSensorConfig.length > 1) {
    throw new HttpException(
      500,
      `more than one active sensor config found for config snapshot ${configSnapshotId}`,
    );
  }

  if (existingSensorConfig.length) {
    sensorConfigToDeactivateId = existingSensorConfig[0].id;
    existingConfig = existingSensorConfig[0].config;
  }

  const sensorDriver = await getSensorDriverById({
    id: sensorDriverId,
  });
  if (!sensorDriver) {
    throw new HttpException(409, "sensor driver specified not found");
  }

  const configToCreate = singlePropertyChange
    // deno-lint-ignore no-explicit-any
    ? { ...(existingConfig && { ...existingConfig as any }), ...config }
    : config;

  const { validation } = sensorDriver;
  const ajv = new Ajv();
  const validate = ajv.compile(validation as AnySchema);
  const isValid = validate(configToCreate);
  if (!isValid) {
    throw new HttpException(422, "invalid config received");
  }

  return await sensorRepository.createSensorConfig({
    ...requestBody,
    config: configToCreate,
    active: true,
    configSnapshotId,
    sensorConfigToDeactivateId,
  });
};

export const createSensorLibraryConfig = async (
  requestBody: CreateSensorLibraryConfigDto,
) => {
  const { name, accountId, config, description } = requestBody;

  const defaultSensorDriver = await getSensorDriver({ limit: 1 });

  const existingSensorLibraryConfig = await getSensorLibraryConfig({ name });
  if (existingSensorLibraryConfig.length) {
    throw new HttpException(409, `${name} already exists`);
  }

  return await sensorRepository.createSensorLibraryConfig({
    name,
    accountId,
    sensorConfig: { config, name, driverId: defaultSensorDriver[0].id },
    description,
  });
};

export const createNewSensorLibraryConfigVersion = async (
  requestBody: CreateSensorLibraryConfigVersionDto,
) => {
  const { id, config, sensorName, accountId, description } = requestBody;

  const sensorLibraryConfig = await getSensorLibraryConfigById({
    id,
    accountId,
    write: true,
  });

  const defaultSensorDriver = await getSensorDriver({ limit: 1 });
  const sensorConfig = {
    name: sensorName,
    config,
    driverId: defaultSensorDriver[0].id,
  };

  const sensorLibraryConfigVersions =
    sensorLibraryConfig.SensorLibraryConfigVersion;

  if (!sensorLibraryConfigVersions.length) {
    await sensorRepository.createNewSensorLibraryConfigVersion({
      accountId,
      sensorConfig,
      sensorLibraryConfigId: id,
      version: 1,
      description,
    });
  } else {
    // already ordered in the db query
    const latestLibraryConfigVersion = sensorLibraryConfigVersions[0];

    const configsEqual = isDeepStrictEqual(
      latestLibraryConfigVersion.SensorConfig.config,
      sensorConfig.config,
    );

    const sensorConfigType = sensorConfig.config?.type;

    const librarySensorConfigType = (latestLibraryConfigVersion.SensorConfig
      .config as JsonObject).type;

    if (sensorConfigType !== librarySensorConfigType) {
      throw new HttpException(
        409,
        `sensors in the same library must be of the same type`,
      );
    }

    if (configsEqual) {
      throw new HttpException(
        409,
        `current sensor config is published as latest version`,
      );
    }
    await sensorRepository.createNewSensorLibraryConfigVersion({
      accountId,
      sensorConfig,
      sensorLibraryConfigId: id,
      version: latestLibraryConfigVersion.version + 1,
      description,
    });
  }
};

export const deleteSensorDriver = async (requestBody: IdDto & AccountIdDto) => {
  const { id, accountId } = requestBody;
  const sensorDriver = await getSensorDriverById({ id });

  if (!sensorDriver || sensorDriver.creatorId !== accountId) {
    throw new HttpException(404, "sensor driver not found");
  }

  if (sensorDriver.SensorConfig.length) {
    throw new HttpException(
      409,
      "active sensor configs found using sensor driver",
    );
  }

  return await sensorRepository.deleteSensorDriver({ id });
};

export const deleteSensorConfig = async (requestBody: IdDto & AccountIdDto) => {
  const { id, accountId } = requestBody;
  const sensorConfig = await getSensorConfigById({ id });

  if (!sensorConfig || sensorConfig.creatorId !== accountId) {
    throw new HttpException(404, "sensor driver not found");
  }

  if (sensorConfig.SensorLibraryConfigVersion.length) {
    throw new HttpException(
      409,
      "sensor config is in use by a sensor config library",
    );
  }

  return await sensorRepository.deleteSensorConfig({ id });
};

export const deleteSensorLibraryConfig = async (
  requestBody: IdDto & AccountIdDto,
) => {
  const { id, accountId } = requestBody;

  await getSensorLibraryConfigById({
    id,
    accountId,
  });

  return await sensorRepository.deleteSensorLibraryConfig({ id });
};

export const getSensorConfigHistory = async (query: QueryConfigHistoryDto) => {
  const { asAt, accountId, deviceId } = query;
  await validateDevice({ id: deviceId, accountId });
  const sensorConfigs = await getSensorConfig(query);

  if (asAt) {
    return sensorConfigs;
  }

  const sensorConfigWithDifference = getSensorConfigChanges(sensorConfigs);

  return sensorConfigWithDifference;
};

export const updateSensorLibraryConfig = async (
  body: UpdateLibraryConfigDto,
) => {
  const { id, accountId } = body;
  await getSensorLibraryConfigById({
    id,
    accountId,
    write: true,
  });

  await sensorRepository.updateSensorLibraryConfig(body);
};
