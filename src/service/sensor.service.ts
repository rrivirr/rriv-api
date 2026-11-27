import {
  assertLibraryUpdateAllowed,
  assertMatchesDriver,
  requireDriver,
} from "./utils/library-config.ts";
import { Ajv, AnySchema } from "ajv";
import {
  CreateSensorConfigDto,
  CreateSensorDriverDto,
  CreateSensorLibraryConfigDto,
  CreateSensorLibraryConfigVersionDto,
  DeactivateSensorConfigDto,
  QuerySensorConfigDto,
  QuerySensorDriverDto,
  QuerySensorLibraryConfigDto,
} from "../types/sensor.types.ts";
import * as sensorRepository from "../repository/sensor.repository.ts";
import { HttpException } from "../utils/http-exception.ts";
import { isUniqueConstraintError } from "../utils/prisma-errors.ts";
import { AccountIdDto, IdDto, IdorNameDto } from "../types/generic.types.ts";
import { getDeviceContext } from "./device-context.service.ts";
import { isDeepStrictEqual } from "node:util";
import {
  QueryConfigHistoryDto,
  UpdateLibraryConfigDto,
} from "../types/config-snapshot.types.ts";
import { getSensorConfigChanges } from "./utils/get-sensor-config-changes.ts";
import { JsonObject } from "generated/internal/prismaNamespace.ts";
import { authDeviceCheck } from "./device.service.ts";
import { isUnchanged, resolveSensorSource } from "./utils/config-source.ts";

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

  try {
    return await sensorRepository.createSensorDriver({
      name,
      accountId,
      validation,
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new HttpException(409, `${name} already exists`);
    }
    throw error;
  }
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
    source,
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

  if (existingSensorConfig.length > 1) {
    throw new HttpException(
      500,
      `more than one active sensor config found for config snapshot ${configSnapshotId}`,
    );
  }

  const previous = existingSensorConfig[0];
  const sensorConfigToDeactivateId: string | undefined = previous?.id;

  const sensorDriver = await getSensorDriverById({
    id: sensorDriverId,
  });
  if (!sensorDriver) {
    throw new HttpException(409, "sensor driver specified not found");
  }

  const configToCreate = singlePropertyChange
    // deno-lint-ignore no-explicit-any
    ? { ...(previous && { ...previous.config as any }), ...config }
    : config;

  const { validation } = sensorDriver;
  const ajv = new Ajv();
  const validate = ajv.compile(validation as AnySchema);
  const isValid = validate(configToCreate);
  if (!isValid) {
    throw new HttpException(422, "invalid config received");
  }

  const sourceColumns = await resolveSensorSource({
    source,
    accountId,
    name,
    config: configToCreate,
    previous,
  });

  // Same settings and source as the active row: accepted, nothing written.
  if (isUnchanged(previous, configToCreate, sourceColumns)) {
    return { ...previous, unchanged: true as const };
  }

  try {
    return await sensorRepository.createSensorConfig({
      ...requestBody,
      ...sourceColumns,
      config: configToCreate,
      active: true,
      configSnapshotId,
      sensorConfigToDeactivateId,
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new HttpException(
        409,
        "an active sensor config with this name already exists in this snapshot",
      );
    }
    throw error;
  }
};

/**
 * A sensor was removed from the device: end its active config row
 * (`active = false`, `deactivatedAt`). The row stays as history. Nothing to
 * end (already removed, or never synced) is not an error.
 */
export const deactivateSensorConfig = async (
  requestBody: DeactivateSensorConfigDto,
) => {
  const { name, accountId, deviceId, contextId } = requestBody;
  const deactivatedAt = requestBody.deactivatedAt ?? new Date();

  const deviceContext = await getDeviceContext({
    contextId,
    deviceId,
    accountId,
  });
  if (!deviceContext) {
    throw new HttpException(422, "device context not found");
  }

  const active = await getSensorConfig({
    name,
    accountId,
    configSnapshotId: deviceContext.configSnapshotId,
    active: true,
  });
  if (!active.length) return null;

  return await sensorRepository.deactivateSensorConfigs({
    ids: active.map((s) => s.id),
    deactivatedAt,
  });
};

export const createSensorLibraryConfig = async (
  requestBody: CreateSensorLibraryConfigDto,
) => {
  const {
    name,
    accountId,
    config,
    description,
    firmwareVersion,
    sensorName,
    sensorDriverId,
  } = requestBody;

  const driver = requireDriver(
    await getSensorDriverById({ id: sensorDriverId }),
    "sensor",
  );
  assertMatchesDriver(driver, config, "sensor");

  const existingSensorLibraryConfig = await getSensorLibraryConfig({
    name,
    accountId,
  });
  if (existingSensorLibraryConfig.length) {
    throw new HttpException(409, `${name} already exists`);
  }

  try {
    return await sensorRepository.createSensorLibraryConfig({
      name,
      accountId,
      sensorConfig: {
        config,
        name: sensorName,
        driverId: driver.id,
      },
      description,
      firmwareVersion,
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new HttpException(409, `${name} already exists`);
    }
    throw error;
  }
};

export const createNewSensorLibraryConfigVersion = async (
  requestBody: CreateSensorLibraryConfigVersionDto,
) => {
  const {
    id,
    config,
    sensorName,
    accountId,
    description,
    firmwareVersion,
    sensorDriverId,
  } = requestBody;

  const sensorLibraryConfig = await getSensorLibraryConfigById({
    id,
    accountId,
    write: true,
  });

  const driver = requireDriver(
    await getSensorDriverById({ id: sensorDriverId }),
    "sensor",
  );
  assertMatchesDriver(driver, config, "sensor");
  const sensorConfig = { name: sensorName, config, driverId: driver.id };

  const sensorLibraryConfigVersions =
    sensorLibraryConfig.SensorLibraryConfigVersion;

  if (!sensorLibraryConfigVersions.length) {
    try {
      await sensorRepository.createNewSensorLibraryConfigVersion({
        accountId,
        sensorConfig,
        sensorLibraryConfigId: id,
        version: 1,
        description,
        firmwareVersion,
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new HttpException(409, "version already published, retry");
      }
      throw error;
    }
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
    try {
      await sensorRepository.createNewSensorLibraryConfigVersion({
        accountId,
        sensorConfig,
        sensorLibraryConfigId: id,
        version: latestLibraryConfigVersion.version + 1,
        description,
        firmwareVersion,
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new HttpException(409, "version already published, retry");
      }
      throw error;
    }
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
  requestBody: IdorNameDto & AccountIdDto,
) => {
  const { accountId } = requestBody;
  let libraryId;

  if ("id" in requestBody) {
    await getSensorLibraryConfigById({
      id: requestBody.id,
      write: true,
      accountId,
    });
    libraryId = requestBody.id;
  } else {
    const config = await getSensorLibraryConfig({
      name: requestBody.name,
      accountId,
    });

    if (!config.length) {
      throw new HttpException(404, "library config not found");
    }
    libraryId = config[0].id;
  }

  return await sensorRepository.deleteSensorLibraryConfig({ id: libraryId });
};

export const getSensorConfigHistory = async (query: QueryConfigHistoryDto) => {
  const { asAt, accountId, deviceIdentifier, deviceValidated } = query;
  if (!deviceValidated) {
    await authDeviceCheck({
      deviceIdentifier,
      accountId,
      relation: "can_write",
    });
  }
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
  const libraryConfig = await getSensorLibraryConfigById({
    id,
    accountId,
    write: true,
  });
  assertLibraryUpdateAllowed(libraryConfig, body);

  try {
    return await sensorRepository.updateSensorLibraryConfig(body);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new HttpException(409, `${body.name} already exists`);
    }
    throw error;
  }
};
