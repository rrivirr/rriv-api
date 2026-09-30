import {
  CreateDeviceContextDto,
  DeviceContextDto,
  UpdateDeviceContextDto,
} from "../types/context.types.ts";
import { HttpException } from "../utils/http-exception.ts";
import { isUniqueConstraintError } from "../utils/prisma-errors.ts";
import * as deviceContextRepository from "../repository/device-context.repository.ts";
import * as configSnapshotRepository from "../repository/config-snapshot.repository.ts";
import { ACTIVE_CONFIG_SNAPSHOT_NAME } from "./utils/constants.ts";
import { validateDeviceContext } from "./utils/validate-device-context.ts";
import { authContextCheck } from "./context.service.ts";
import { authDeviceCheck } from "./device.service.ts";

/**
 * Returns the device context's "active" config snapshot, creating it if
 * needed. Idempotent under concurrency: if another request created it first
 * (partial unique index on config_snapshot(device_context_id) WHERE active),
 * the winner is adopted instead of failing.
 */
const getOrCreateActiveSnapshot = async (
  deviceContextId: string,
  accountId: string,
) => {
  try {
    return await configSnapshotRepository.createConfigSnapshot({
      name: ACTIVE_CONFIG_SNAPSHOT_NAME,
      accountId,
      active: true,
      deviceContextId,
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }
    const existing = await configSnapshotRepository
      .getActiveConfigSnapshotByDeviceContext({ deviceContextId });
    if (!existing) {
      throw error;
    }
    return existing;
  }
};

export const createDeviceContext = async (
  requestBody: CreateDeviceContextDto,
) => {
  const { contextId, deviceId, accountId, assignedDeviceName } = requestBody;

  await authContextCheck({ contextId, accountId, relation: "can_edit" });

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

  const deviceDetails = await authDeviceCheck({
    id: deviceId,
    accountId,
    relation: "can_write",
  });

  if (deviceDetails.activeDeviceContext) {
    throw new HttpException(
      422,
      `device already in ${deviceDetails.activeDeviceContext.Context.name} context`,
    );
  }

  // add device to context
  try {
    await deviceContextRepository.createDeviceContext({
      deviceId,
      contextId,
      assignedDeviceName,
      accountId,
    });
  } catch (error) {
    // The checks above are separate from the insert; the partial unique
    // indexes on device_context are the real guard against concurrent adds.
    if (isUniqueConstraintError(error)) {
      throw new HttpException(
        422,
        "device is already in a context, or the name is already used in this context",
      );
    }
    throw error;
  }
};

export const getDeviceContext = async (query: DeviceContextDto) => {
  const { contextId, deviceId, accountId } = query;

  const activeDeviceContext = await validateDeviceContext({
    contextId,
    accountId,
    deviceId,
    relation: "can_edit",
  });

  let configSnapshotId: string;
  if (!activeDeviceContext.ConfigSnapshot.length) {
    const configSnapshot = await getOrCreateActiveSnapshot(
      activeDeviceContext.id,
      accountId,
    );
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
  const { contextId, deviceId, accountId, assignedDeviceName, end } = body;

  await validateDeviceContext({
    deviceId,
    contextId,
    accountId,
    relation: "can_edit",
  });

  if (end) {
    await authDeviceCheck({
      id: deviceId,
      accountId,
      relation: "owner",
    });
  }

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

  try {
    await deviceContextRepository.updateDeviceContext(body);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new HttpException(
        422,
        `${assignedDeviceName} already exists in this context`,
      );
    }
    throw error;
  }
};

export const deleteDeviceContext = async (body: DeviceContextDto) => {
  const { contextId, deviceId, accountId } = body;
  await validateDeviceContext({ ...body, relation: "can_edit" });
  await authDeviceCheck({
    id: deviceId,
    accountId,
    relation: "owner",
  });
  await deviceContextRepository.deleteDeviceContext({ contextId, deviceId });
};
