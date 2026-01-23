import { Ajv, AnySchema } from "ajv";
import { isDeepStrictEqual } from "node:util";
import {
  CreateDataloggerConfigDto,
  CreateDataloggerDriverDto,
  CreateDataloggerLibraryConfigDto,
  CreateDataloggerLibraryConfigVersionDto,
  QueryDataloggerDriverDto,
  QueryDataloggerLibraryConfigDto,
} from "../types/datalogger.types.ts";
import * as dataloggerRepository from "../repository/datalogger.repository.ts";
import { HttpException } from "../utils/http-exception.ts";
import { AccountIdDto, IdDto, IdorNameDto } from "../types/generic.types.ts";
import { getDeviceContext } from "./device-context.service.ts";
import {
  QueryConfigHistoryDto,
  UpdateLibraryConfigDto,
} from "../types/config-snapshot.types.ts";
import { getDataloggerConfigChanges } from "./utils/get-datalogger-config-changes.ts";
import { validateDevice } from "./utils/validate-device.ts";

export const getDataloggerDriver = async (query: QueryDataloggerDriverDto) => {
  return await dataloggerRepository.getDataloggerDriver(query);
};

export const getDataloggerLibraryConfig = async (
  query: QueryDataloggerLibraryConfigDto,
) => {
  return await dataloggerRepository.getDataloggerLibraryConfig(query);
};

export const getDataloggerLibraryConfigById = async (
  query: IdDto & AccountIdDto & { write?: boolean },
) => {
  const { accountId, id, write } = query;
  const dataloggerLibraryConfig = await dataloggerRepository
    .getDataloggerLibraryConfigById({ id });
  if (write) {
    if (
      !dataloggerLibraryConfig ||
      dataloggerLibraryConfig.creatorId !== accountId
    ) {
      throw new HttpException(404, "library config not found");
    }
  } else {
    if (
      !dataloggerLibraryConfig ||
      (dataloggerLibraryConfig.creatorId !== accountId &&
        !dataloggerLibraryConfig.isPublic)
    ) {
      throw new HttpException(404, "library config not found");
    }
  }
  return dataloggerLibraryConfig;
};

const getDataloggerDriverById = async (query: IdDto) => {
  return await dataloggerRepository.getDataloggerDriverById(query);
};

const getDataloggerConfigById = async (query: IdDto) => {
  return await dataloggerRepository.getDataloggerConfigById(query);
};

const getActiveDataloggerConfig = async (
  query: {
    deviceId: string;
    contextId: string;
    accountId: string;
    configSnapshotId?: string;
  },
) => {
  const {
    contextId,
    deviceId,
    accountId,
  } = query;

  const deviceContext = await getDeviceContext({
    contextId,
    deviceId,
    accountId,
  });

  if (!deviceContext) {
    throw new HttpException(422, "device context not found");
  }

  const { configSnapshotId } = deviceContext;

  const dataloggerConfigs = await dataloggerRepository
    .getActiveDataloggerConfig({ configSnapshotId, accountId });

  if (dataloggerConfigs.length > 1) {
    throw new HttpException(
      500,
      `more than one active datalogger config found for config snapshot ${configSnapshotId}`,
    );
  }

  return { dataloggerConfig: dataloggerConfigs[0], configSnapshotId };
};

export const createDataloggerDriver = async (
  requestBody: CreateDataloggerDriverDto,
) => {
  const { name, accountId, validation } = requestBody;

  const existingDataloggerConfig = await getDataloggerDriver({ name });
  if (existingDataloggerConfig.length) {
    throw new HttpException(409, `${name} already exists`);
  }

  return await dataloggerRepository.createDataloggerDriver({
    name,
    accountId,
    validation,
  });
};

export const createDataloggerConfig = async (
  requestBody: CreateDataloggerConfigDto,
) => {
  const {
    accountId,
    dataloggerDriverId,
    config,
    deviceId,
    contextId,
    singlePropertyChange,
  } = requestBody;

  const { dataloggerConfig, configSnapshotId } =
    await getActiveDataloggerConfig({
      contextId,
      deviceId,
      accountId,
    });

  let existingConfig;
  if (dataloggerConfig && singlePropertyChange) {
    existingConfig = dataloggerConfig.config;
  }

  const dataloggerDriver = await getDataloggerDriverById({
    id: dataloggerDriverId,
  });
  if (!dataloggerDriver) {
    throw new HttpException(409, "datalogger driver specified not found");
  }

  const configToCreate = singlePropertyChange
    // deno-lint-ignore no-explicit-any
    ? { ...(existingConfig && { ...existingConfig as any }), ...config }
    : config;

  const { validation } = dataloggerDriver;
  const ajv = new Ajv();
  const validate = ajv.compile(validation as AnySchema);
  const isValid = validate(configToCreate);
  if (!isValid) {
    throw new HttpException(422, "invalid config received");
  }

  return await dataloggerRepository.createDataloggerConfig({
    ...requestBody,
    config: configToCreate,
    active: true,
    configSnapshotId,
    dataloggerConfigToDeactivateId: dataloggerConfig?.id,
  });
};

export const createDataloggerLibraryConfig = async (
  requestBody: CreateDataloggerLibraryConfigDto,
) => {
  const { name, accountId, config, description } = requestBody;
  const defaultDataloggerDriver = await getDataloggerDriver({ limit: 1 });

  const existingDataloggerLibraryConfig = await getDataloggerLibraryConfig({
    name,
  });
  if (existingDataloggerLibraryConfig.length) {
    throw new HttpException(409, `${name} already exists`);
  }

  return await dataloggerRepository.createDataloggerLibraryConfig({
    name,
    accountId,
    dataloggerConfig: { driverId: defaultDataloggerDriver[0].id, config },
    description,
  });
};

export const createNewDataloggerLibraryConfigVersion = async (
  requestBody: CreateDataloggerLibraryConfigVersionDto,
) => {
  const { id, config, accountId, description } = requestBody;

  const dataloggerLibraryConfig = await getDataloggerLibraryConfigById({
    id,
    accountId,
    write: true,
  });
  const defaultDataloggerDriver = await getDataloggerDriver({ limit: 1 });
  const dataloggerConfig = { config, driverId: defaultDataloggerDriver[0].id };

  const dataloggerLibraryConfigVersions =
    dataloggerLibraryConfig.DataloggerLibraryConfigVersion;

  if (!dataloggerLibraryConfigVersions.length) {
    await dataloggerRepository.createNewDataloggerLibraryConfigVersion({
      accountId,
      dataloggerConfig,
      dataloggerLibraryConfigId: id,
      version: 1,
      description,
    });
  } else {
    // already ordered in the db query
    const latestLibraryConfigVersion = dataloggerLibraryConfigVersions[0];
    const configsEqual = isDeepStrictEqual(
      latestLibraryConfigVersion.DataloggerConfig.config,
      dataloggerConfig.config,
    );

    if (configsEqual) {
      throw new HttpException(
        409,
        `current datalogger config is already published as latest version`,
      );
    }
    await dataloggerRepository.createNewDataloggerLibraryConfigVersion({
      accountId,
      dataloggerConfig,
      dataloggerLibraryConfigId: id,
      version: latestLibraryConfigVersion.version + 1,
      description,
    });
  }
};

export const deleteDataloggerDriver = async (
  requestBody: IdDto & AccountIdDto,
) => {
  const { id, accountId } = requestBody;
  const dataloggerDriver = await getDataloggerDriverById({ id });

  if (!dataloggerDriver || dataloggerDriver.creatorId !== accountId) {
    throw new HttpException(404, "datalogger driver not found");
  }

  if (dataloggerDriver.DataloggerConfig.length) {
    throw new HttpException(
      409,
      "active datalogger configs found using datalogger driver",
    );
  }

  return await dataloggerRepository.deleteDataloggerDriver({ id });
};

export const deleteDataloggerConfig = async (
  requestBody: IdDto & AccountIdDto,
) => {
  const { id, accountId } = requestBody;
  const dataloggerConfig = await getDataloggerConfigById({ id });

  if (!dataloggerConfig || dataloggerConfig.creatorId !== accountId) {
    throw new HttpException(404, "datalogger driver not found");
  }

  if (dataloggerConfig.DataloggerLibraryConfigVersion.length) {
    throw new HttpException(
      409,
      "datalogger config is in use by a datalogger config library",
    );
  }

  return await dataloggerRepository.deleteDataloggerConfig({ id });
};

export const deleteDataloggerLibraryConfig = async (
  requestBody: IdorNameDto & AccountIdDto,
) => {
  const { accountId } = requestBody;
  let libraryId;

  if ("id" in requestBody) {
    await getDataloggerLibraryConfigById({
      id: requestBody.id,
      write: true,
      accountId,
    });
    libraryId = requestBody.id;
  } else {
    const config = await getDataloggerLibraryConfig({
      name: requestBody.name,
      accountId,
    });

    if (!config.length) {
      throw new HttpException(404, "library config not found");
    }
    libraryId = config[0].id;
  }

  return await dataloggerRepository.deleteDataloggerLibraryConfig({
    id: libraryId,
  });
};

export const getDataloggerConfigHistory = async (
  query: QueryConfigHistoryDto,
) => {
  const { deviceId, accountId, asAt } = query;
  await validateDevice({ id: deviceId, accountId });

  const dataloggerConfigs = await dataloggerRepository.getDataloggerConfig(
    query,
  );

  if (asAt) {
    return dataloggerConfigs;
  }

  const dataloggerConfigWithDifference = getDataloggerConfigChanges(
    dataloggerConfigs,
  );

  return dataloggerConfigWithDifference;
};

export const updateDataloggerLibraryConfig = async (
  body: UpdateLibraryConfigDto,
) => {
  const { id, accountId } = body;
  await getDataloggerLibraryConfigById({
    id,
    accountId,
    write: true,
  });

  await dataloggerRepository.updateDataloggerLibraryConfig(body);
};
