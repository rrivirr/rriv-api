import {
  CreateDeviceContextDto,
  DeviceContextDto,
  UpdateDeviceContextDto,
} from "../types/context.types.ts";
import { HttpException } from "../utils/http-exception.ts";
import { validateDevice } from "./utils/validate-device.ts";
import * as deviceContextRepository from "../repository/device-context.repository.ts";
import { validateContext } from "./utils/validate-context.ts";

export const getDeviceContext = async (query: DeviceContextDto) => {
  const { contextId, deviceId, accountId } = query;

  await validateContext({ contextId, accountId });

  const deviceObject = await validateDevice({ id: deviceId, accountId });
  if (!deviceObject) {
    throw new HttpException(404, "device not found");
  }
  const { activeDeviceContext } = deviceObject;

  if (!activeDeviceContext || activeDeviceContext.contextId !== contextId) {
    return null;
  }

  return { ...activeDeviceContext, Context: undefined };
};

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

  if (!deviceObject) {
    throw new HttpException(404, "device not found");
  }

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
  });
};

export const updateDeviceContext = async (body: UpdateDeviceContextDto) => {
  const { contextId, deviceId, accountId, assignedDeviceName } = body;

  await validateContext({ contextId, accountId });

  const deviceObject = await validateDevice({ id: deviceId, accountId });
  if (!deviceObject) {
    throw new HttpException(404, "device not found");
  }

  const { activeDeviceContext } = deviceObject;

  if (!activeDeviceContext || activeDeviceContext.contextId !== contextId) {
    throw new HttpException(422, "device not found in context");
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

  await deviceContextRepository.updateDeviceContext(body);
};

export const deleteDeviceContext = async (body: DeviceContextDto) => {
  const { contextId, deviceId, accountId } = body;

  await validateContext({ contextId, accountId });

  const deviceObject = await validateDevice({ id: deviceId, accountId });
  if (!deviceObject) {
    throw new HttpException(404, "device not found");
  }

  const { activeDeviceContext } = deviceObject;

  if (!activeDeviceContext || activeDeviceContext.contextId !== contextId) {
    throw new HttpException(422, "device not found in context");
  }

  await deviceContextRepository.deleteDeviceContext({ contextId, deviceId });
};
