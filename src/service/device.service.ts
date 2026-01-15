import {
  adjectives,
  animals,
  colors,
  uniqueNamesGenerator,
} from "npm:@joaomoreno/unique-names-generator";
import grpc from "npm:@grpc/grpc-js";
import deviceGrpc from "@chirpstack/chirpstack-api/api/device_grpc_pb.js";
import devicePb from "@chirpstack/chirpstack-api/api/device_pb.js";
import {
  AccountUniqueDeviceDto,
  BindDeviceDto,
  CreateFirmwareEntryDto,
  ProvisionDeviceDto,
  QueryDeviceDto,
  QueryFirmwareHistoryDto,
  RegisterEuiDto,
  SendCommandDto,
  SerialNumberDeviceDto,
} from "../types/device.types.ts";
import * as deviceRepository from "../repository/device.repository.ts";
import { HttpException } from "../utils/http-exception.ts";
import { IdDto } from "../types/generic.types.ts";
import { validateDevice } from "./utils/validate-device.ts";
import { getSeed } from "./utils/get-seed.ts";
import { validateDeviceContext } from "./utils/validate-device-context.ts";
import { idSchema } from "../handler/generic/generic.schema.ts";

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
  const payload = { ...query };
  if (query.identifier) {
    const { success, data } = idSchema.safeParse({ id: query.identifier });
    if (success) {
      payload["id"] = data.id;
      delete payload.identifier;
    }
  }

  return await deviceRepository.getDevices(payload);
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

export const registerEui = async (body: RegisterEuiDto) => {
  const { deviceId, accountId, eui } = body;
  await validateDevice({ id: deviceId, accountId });

  const activeEui = await deviceRepository.getActiveEui({ deviceId });
  if (activeEui && activeEui.eui === eui) {
    return 200;
  }
  await deviceRepository.registerEui(body);
  return 201;
};

export const sendCommand = async (body: SendCommandDto) => {
  const { accountId, identifier, command } = body;
  const devices = await getDevices({ accountId, identifier });
  const device = devices[0];
  if (!device) {
    throw new HttpException(404, "no device found with specified identifier");
  }

  const eui = device.DeviceEuis[0]?.eui;
  if (!eui) {
    throw new HttpException(422, "no active eui registered for device");
  }

  const server = Deno.env.get("CHIRPSTACK_API_URL")!;
  const apiToken = Deno.env.get("CHIRPSTACK_API_KEY")!;

  const deviceService = new deviceGrpc.DeviceServiceClient(
    server,
    grpc.credentials.createInsecure(),
  );

  // Create the Metadata object.
  const metadata = new grpc.Metadata();
  metadata.set("authorization", "Bearer " + apiToken);

  // Enqueue downlink.
  const item = new devicePb.DeviceQueueItem();
  item.setDevEui(eui);
  item.setFPort(10);
  item.setConfirmed(false);
  item.setData(command);

  const enqueueReq = new devicePb.EnqueueDeviceQueueItemRequest();
  enqueueReq.setQueueItem(item);

  const enqueue = () =>
    new Promise((resolve, reject) => {
      deviceService.enqueue(enqueueReq, metadata, (err, resp) => {
        if (err) {
          reject(err);
        }

        resolve(resp?.getId());
      });
    });

  const responseId = await enqueue();

  return { responseId };
};
