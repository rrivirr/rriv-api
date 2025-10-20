import {
  CreateDeviceContextDto,
  DeviceContextDto,
  UpdateDeviceContextDto,
} from "../types/context.types.ts";
import { HttpException } from "../utils/http-exception.ts";
import { validateDevice } from "./utils/validate-device.ts";
import * as deviceContextRepository from "../repository/device-context.repository.ts";
import * as configSnapshotRepository from "../repository/config-snapshot.repository.ts";
import { validateContext } from "./utils/validate-context.ts";
import { ACTIVE_CONFIG_SNAPSHOT_NAME } from "./utils/constants.ts";
import { validateDeviceContext } from "./utils/validate-device-context.ts";

export const createDeviceContext = async (
  requestBody: CreateDeviceContextDto,
) => {
  const { contextId, deviceId, accountId, assignedDeviceName } = requestBody;

  await validateContext({ contextId, accountId });

  const deviceContext = await deviceContextRepository.getDeviceContext({
    contextId,
    assignedDeviceName,
  });
  if (deviceContext.length) {
    throw new HttpException(
      422,
      `${assignedDeviceName} already exists in this context`,
    );
  }

  const deviceObject = await validateDevice({ id: deviceId, accountId });
  const { activeDeviceContext } = deviceObject;

  if (activeDeviceContext) {
    throw new HttpException(
      422,
      `device already in ${activeDeviceContext.Context.name} context`,
    );
  }

  // add device to context
  await deviceContextRepository.createDeviceContext({
    deviceId,
    contextId,
    assignedDeviceName,
    accountId,
  });
};

export const getDeviceContext = async (query: DeviceContextDto) => {
  const { contextId, deviceId, accountId } = query;

  await validateContext({ contextId, accountId });

  const deviceObject = await validateDevice({ id: deviceId, accountId });
  const { activeDeviceContext } = deviceObject;

  if (!activeDeviceContext || activeDeviceContext.contextId !== contextId) {
    return null;
  }

  let configSnapshotId: string;
  if (!activeDeviceContext.ConfigSnapshot.length) {
    const configSnapshot = await configSnapshotRepository.createConfigSnapshot({
      name: ACTIVE_CONFIG_SNAPSHOT_NAME,
      accountId,
      active: true,
      deviceContextId: activeDeviceContext.id,
    });
    configSnapshotId = configSnapshot.id;
  } else {
    configSnapshotId = activeDeviceContext.ConfigSnapshot[0].id;
  }

  return {
    ...activeDeviceContext,
    configSnapshotId,
    Context: undefined,
    ConfigSnapshot: undefined,
  };
};

export const updateDeviceContext = async (body: UpdateDeviceContextDto) => {
  const { contextId, deviceId, accountId, assignedDeviceName } = body;

  await validateDeviceContext({ deviceId, contextId, accountId });

  if (assignedDeviceName) {
    // assignedDeviceName should be unique in a context
    const deviceContext = await deviceContextRepository.getDeviceContext({
      contextId,
      assignedDeviceName,
    });
    if (deviceContext.length) {
      throw new HttpException(
        422,
        `${assignedDeviceName} already exists in this context`,
      );
    }
  }

  await deviceContextRepository.updateDeviceContext(body);
};

export const deleteDeviceContext = async (body: DeviceContextDto) => {
  const { contextId, deviceId } = body;
  await validateDeviceContext(body);
  await deviceContextRepository.deleteDeviceContext({ contextId, deviceId });
};
