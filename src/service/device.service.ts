import {
  adjectives,
  animals,
  colors,
  uniqueNamesGenerator,
} from "npm:@joaomoreno/unique-names-generator";
import {
  AccountUniqueDeviceDto,
  BindDeviceDto,
  CreateFirmwareEntryDto,
  ProvisionDeviceDto,
  QueryDeviceDto,
  QueryFirmwareHistoryDto,
  SerialNumberDeviceDto,
} from "../types/device.types.ts";
import * as deviceRepository from "../repository/device.repository.ts";
import { HttpException } from "../utils/http-exception.ts";
import { IdDto } from "../types/generic.types.ts";
import { validateDevice } from "./utils/validate-device.ts";
import { getSeed } from "./utils/get-seed.ts";
import { validateDeviceContext } from "./utils/validate-device-context.ts";

const getNewIdentifiers = async (lastSerialNumber?: string) => {
  let newSerialNumber = 0n;
  if (lastSerialNumber) {
    const number = [...lastSerialNumber].reduce(
      (acc, curr) => BigInt(parseInt(curr, 36)) + BigInt(36) * acc,
      0n,
    );

    newSerialNumber = number + 1n;
  }
  const serialNumber = newSerialNumber.toString(36).padStart(5, "0");
  const seed = getSeed(serialNumber);

  const uniqueName = uniqueNamesGenerator({
    dictionaries: [colors, adjectives, animals],
    seed,
    separator: "-",
  });

  const devices = await deviceRepository.getAllDevices({
    query: { uniqueName },
  });

  if (devices.length) {
    throw new HttpException(
      500,
      `duplicate unique name generated\nunique name:${uniqueName}, 
      serialNumber:${serialNumber}\ndevice:${devices[0].id},serialnumber:${
        devices[0].serialNumber
      }`,
    );
  }

  return {
    serialNumber,
    uniqueName,
  };
};

export const provisionDevice = async (body: ProvisionDeviceDto) => {
  const { uid, accountId, type } = body;

  const existingDevices = await deviceRepository.getAllDevices({
    query: { uid, type },
  });

  if (existingDevices.length) {
    const existingDevice = existingDevices[0];
    if (existingDevice.Bind.length) {
      throw new HttpException(409, "device already provisioned");
    } else {
      return { status: 200, device: existingDevice };
    }
  }

  const [device] = await deviceRepository.getAllDevices({
    orderBy: "createdAt",
    order: "desc",
    limit: 1,
    query: {},
  });

  const { serialNumber, uniqueName } = await getNewIdentifiers(
    device?.serialNumber,
  );

  const newDevice = await deviceRepository.createDevice({
    serialNumber,
    uniqueName,
    uid,
    accountId,
    type,
  });
  return { status: 201, device: newDevice };
};

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

export const bindDevice = async (requestBody: BindDeviceDto) => {
  const { accountId, serialNumber } = requestBody;

  const deviceObject = await getDeviceBySerialNumberOrId({
    serialNumber,
  });

  if (!deviceObject) {
    throw new HttpException(
      422,
      "invalid serial number received",
    );
  }
  const { device, activeBind } = deviceObject;

  if (!activeBind) {
    await deviceRepository.bindDevice({ serialNumber, accountId });
    return device;
  }

  if (activeBind.accountId !== accountId) {
    throw new HttpException(409, "device bound to another user");
  }

  return device;
};

export const unbindDevice = async (requestBody: AccountUniqueDeviceDto) => {
  const deviceObject = await validateDevice(requestBody);
  const { device, activeBind } = deviceObject;
  await deviceRepository.unbindDevice({ bindId: activeBind.id });
  return device;
};

export const getDevices = async (query: QueryDeviceDto) => {
  return await deviceRepository.getDevice(query);
};

export const deleteDevice = async (requestBody: AccountUniqueDeviceDto) => {
  const deviceObject = await validateDevice(requestBody);

  await deviceRepository.deleteDevice({
    serialNumber: requestBody.serialNumber,
  });
  return deviceObject.device;
};

export const createFirmwareEntry = async (
  requestBody: CreateFirmwareEntryDto,
) => {
  const { deviceId, contextId, accountId, version, installedAt } = requestBody;
  const deviceContext = await validateDeviceContext({
    deviceId,
    contextId,
    accountId,
  });
  await deviceRepository.createFirmwareEntry({
    deviceContextId: deviceContext.id,
    accountId,
    version,
    installedAt,
  });
};

export const getFirmwareHistory = async (query: QueryFirmwareHistoryDto) => {
  const { accountId } = query;
  if ("deviceId" in query) {
    await validateDevice({ id: query.deviceId, accountId });
  } else {
    await validateDevice({ serialNumber: query.serialNumber, accountId });
  }
  const firmwareHistory = await deviceRepository.getFirmwareHistory(query);
  return firmwareHistory.map((
    { version, installedAt, createdAt, DeviceContext: { Context: { name } } },
  ) => ({
    version,
    installedAt,
    createdAt,
    contextName: name,
  }));
};
