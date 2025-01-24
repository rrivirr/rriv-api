import {
  AccountUniqueDeviceDto,
  BindDeviceDto,
  QueryDeviceDto,
  SerialNumberDeviceDto,
} from "../types/device.types.ts";
import * as deviceRepository from "../repository/device.repository.ts";
import { HttpException } from "../utils/http-exception.ts";
import { IdDto } from "../types/generic.types.ts";
import { validateDevice } from "./utils/validate-device.ts";

export const getDeviceBySerialNumberOrId = async (
  requestBody: SerialNumberDeviceDto | IdDto,
) => {
  const deviceWithBind = await deviceRepository.getDeviceBySerialNumberOrId(
    requestBody,
  );

  if (!deviceWithBind) {
    return null;
  }

  const { Bind, DeviceContext, ...device } = deviceWithBind;
  const numberOfActiveBinds = Bind.length;
  const numberOfActiveDeviceContexts = DeviceContext.length;

  if (numberOfActiveBinds > 1) {
    throw new HttpException(
      500,
      `device, ${JSON.stringify(requestBody)} has more that one active binds`,
    );
  }

  if (numberOfActiveDeviceContexts > 1) {
    throw new HttpException(
      500,
      `device, ${
        JSON.stringify(requestBody)
      } has more that one active device contexts`,
    );
  }

  return {
    device,
    activeBind: numberOfActiveBinds ? Bind[0] : null,
    activeDeviceContext: numberOfActiveDeviceContexts ? DeviceContext[0] : null,
  };
};

const getDeviceByUniqueName = async (body: { uniqueName: string }) => {
  return await deviceRepository.getDeviceByUniqueName(body);
};

export const bindDevice = async (requestBody: BindDeviceDto) => {
  const { accountId, serialNumber, uniqueName } = requestBody;
  const deviceObject = await getDeviceBySerialNumberOrId({
    serialNumber,
  });

  if (!deviceObject) {
    if (!uniqueName) {
      throw new HttpException(422, "uniquename of device is required");
    }

    const existingDevice = await getDeviceByUniqueName({ uniqueName });
    if (existingDevice) {
      throw new HttpException(
        422,
        "uniquename has been assigned to another device",
      );
    }

    const device = await deviceRepository.createDevice({
      ...requestBody,
      uniqueName,
    });
    return { device, status: 201 };
  }
  const { device, activeBind } = deviceObject;

  if (!activeBind) {
    await deviceRepository.bindDevice({ serialNumber, accountId });
    return { device, status: 200 };
  }

  if (activeBind.accountId !== accountId) {
    throw new HttpException(409, "device bound to another user");
  }

  return { device, status: 200 };
};

export const unbindDevice = async (requestBody: AccountUniqueDeviceDto) => {
  const deviceObject = await validateDevice(requestBody);
  if (!deviceObject) {
    throw new HttpException(404, "device not found");
  }
  const { device, activeBind } = deviceObject;
  await deviceRepository.unbindDevice({ bindId: activeBind.id });
  return device;
};

export const getDevices = async (query: QueryDeviceDto) => {
  return await deviceRepository.getDevice(query);
};

export const deleteDevice = async (requestBody: AccountUniqueDeviceDto) => {
  const deviceObject = await validateDevice(requestBody);
  if (!deviceObject) {
    throw new HttpException(404, "device not found");
  }

  await deviceRepository.deleteDevice({
    serialNumber: requestBody.serialNumber,
  });
  return deviceObject.device;
};
