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

export const getSensorConfig = async (query: QuerySensorConfigDto) => {
  return await sensorRepository.getSensorConfig(query);
};

export const getSensorDriver = async (query: QuerySensorDriverDto) => {
  return await sensorRepository.getSensorDriver(query);
};

export const getSensorLibraryConfig = async (
  query: QuerySensorLibraryConfigDto,
) => {
  return await sensorRepository.getSensorLibraryConfig(query);
};

export const getSensorLibraryConfigById = async (query: IdDto) => {
  return await sensorRepository.getSensorLibraryConfigById(query);
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
  const { name, accountId, sensorDriverId, config } = requestBody;

  const existingSensorConfig = await getSensorConfig({ name, accountId });
  if (existingSensorConfig.length) {
    throw new HttpException(409, `${name} already exists`);
  }

  const sensorDriver = await getSensorDriverById({
    id: sensorDriverId,
  });
  if (!sensorDriver) {
    throw new HttpException(409, "sensor driver specified not found");
  }

  const { validation } = sensorDriver;
  const ajv = new Ajv();
  const validate = ajv.compile(validation as AnySchema);
  const isValid = validate(config);
  if (!isValid) {
    throw new HttpException(422, "invalid config received");
  }

  return await sensorRepository.createSensorConfig(requestBody);
};

export const createSensorLibraryConfig = async (
  requestBody: CreateSensorLibraryConfigDto,
) => {
  const { name, accountId, sensorConfigId } = requestBody;

  const sensorConfig = await getSensorConfigById({ id: sensorConfigId });
  if (!sensorConfig || sensorConfig.creatorId !== accountId) {
    throw new HttpException(404, "sensor config not found");
  }

  const existingSensorLibraryConfig = await getSensorLibraryConfig({ name });
  if (existingSensorLibraryConfig.length) {
    throw new HttpException(409, `${name} already exists`);
  }

  return await sensorRepository.createSensorLibraryConfig(requestBody);
};

export const createNewSensorLibraryConfigVersion = async (
  requestBody: CreateSensorLibraryConfigVersionDto,
) => {
  const { id, sensorConfigId, accountId } = requestBody;

  const sensorLibraryConfig = await getSensorLibraryConfigById({ id });
  if (!sensorLibraryConfig || sensorLibraryConfig.creatorId !== accountId) {
    throw new HttpException(404, "sensor library config not found");
  }

  const sensorLibraryConfigVersions =
    sensorLibraryConfig.SensorLibraryConfigVersion;

  if (!sensorLibraryConfigVersions.length) {
    await sensorRepository.createNewSensorLibraryConfigVersion({
      accountId,
      sensorConfigId,
      sensorLibraryConfigId: id,
      version: 1,
    });
  } else {
    // check if sensorConfigId has already been published to this library
    const existingSensorConfigId = sensorLibraryConfigVersions.find((s) =>
      s.SensorConfig.id === sensorConfigId
    );
    if (existingSensorConfigId) {
      throw new HttpException(
        409,
        `sensorConfigId already added to this library as version ${existingSensorConfigId.version}`,
      );
    }
    // already ordered in the db query
    const latestLibraryConfigVersion = sensorLibraryConfigVersions[0];
    await sensorRepository.createNewSensorLibraryConfigVersion({
      accountId,
      sensorConfigId,
      sensorLibraryConfigId: id,
      version: latestLibraryConfigVersion.version + 1,
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

  if (
    sensorConfig.SensorConfigSnapshot.length ||
    sensorConfig.SensorLibraryConfigVersion.length
  ) {
    throw new HttpException(
      409,
      "sensor config is in use by a config snapshot or a sensor config library",
    );
  }

  return await sensorRepository.deleteSensorConfig({ id });
};

export const deleteSensorLibraryConfig = async (
  requestBody: IdDto & AccountIdDto,
) => {
  const { id, accountId } = requestBody;

  const sensorLibraryConfig = await getSensorLibraryConfigById({ id });
  if (!sensorLibraryConfig || sensorLibraryConfig.creatorId !== accountId) {
    throw new HttpException(404, "sensor library config not found");
  }

  return await sensorRepository.deleteSensorLibraryConfig({ id });
};
