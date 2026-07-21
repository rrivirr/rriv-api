import {
  adjectives,
  animals,
  colors,
  uniqueNamesGenerator,
} from "npm:@joaomoreno/unique-names-generator";
import devicePb from "@chirpstack/chirpstack-api/api/device_pb.js";
import {
  AccountUniqueDeviceDto,
  BindDeviceDto,
  CreateFirmwareEntryDto,
  CreateLogDto,
  DeviceIdentifierDto,
  ProvisionDeviceDto,
  QueryDeviceDto,
  QueryFirmwareHistoryDto,
  QueryLogsDto,
  RegisterEuiDto,
  SendCommandDto,
} from "../types/device.types.ts";
import { getChirpstackConnection } from "../infra/chirpstack.ts";
import * as deviceRepository from "../repository/device.repository.ts";
import { HttpException } from "../utils/http-exception.ts";
import { IdDto } from "../types/generic.types.ts";
import { getSeed } from "./utils/get-seed.ts";
import { validateDeviceContext } from "./utils/validate-device-context.ts";
import { idSchema } from "../handler/generic/generic.schema.ts";
import {
  authorizationCheck,
  listObjects,
  listUsers,
  read,
  SYSTEM,
} from "./auth.service.ts";

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

export const authDeviceCheck = async (
  requestBody: (DeviceIdentifierDto | IdDto) & {
    accountId: string;
    relation: "owner" | "can_write";
  },
) => {
  const { accountId, relation, ...deviceIdentifier } = requestBody;

  const deviceObject = await getDeviceByIdentifierOrId(deviceIdentifier);
  if (!deviceObject || !deviceObject.activeBind) {
    throw new HttpException(404, "device not found");
  }

  const deviceId = deviceObject.device.id;

  await authorizationCheck({
    object: `device:${deviceId}`,
    user: `user:${accountId}`,
    relation: relation,
  });

  return deviceObject;
};

export const provisionDevice = async (body: ProvisionDeviceDto) => {
  const { uid, accountId, type } = body;

  const existingDevices = await deviceRepository.getAllDevices({
    query: { uid, type },
  });

  if (existingDevices.length) {
    const existingDevice = existingDevices[0];
    return { status: 200, device: { ...existingDevice, Bind: undefined } };
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

export const getDeviceByIdentifierOrId = async (
  requestBody: DeviceIdentifierDto | IdDto,
) => {
  const deviceWithBind = await deviceRepository.getDeviceByIdentifierOrId(
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

  const deviceObject = await getDeviceByIdentifierOrId({
    deviceIdentifier: serialNumber,
  });

  if (!deviceObject) {
    throw new HttpException(
      422,
      "invalid serial number received",
    );
  }
  const { device } = deviceObject;

  // get device owner
  const ownerIds = await listUsers({
    userType: "user",
    objectType: "device",
    id: device.id,
    relation: "owner",
  });

  if (ownerIds.length) {
    if (ownerIds[0].object.id !== accountId) {
      throw new HttpException(409, "device bound to another user");
    }

    return device;
  }

  await deviceRepository.bindDevice({
    accountId,
    deviceId: deviceObject.device.id,
  });

  return device;
};

export const unbindDevice = async (requestBody: AccountUniqueDeviceDto) => {
  const { serialNumber, accountId } = requestBody;

  const deviceObject = await authDeviceCheck({
    deviceIdentifier: serialNumber,
    accountId,
    relation: "owner",
  });

  const { device, activeBind } = deviceObject;
  await deviceRepository.unbindDevice({ bindId: activeBind!.id });
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
  let deviceIds = await listObjects({
    user: `user:${payload.accountId}`,
    type: "device",
    relation: "can_write",
  });

  if (payload.id) {
    if (!deviceIds.includes(payload.id)) {
      throw new HttpException(403, "access to resource denied");
    }
    deviceIds = [payload.id];
  }

  return await deviceRepository.getDevices({ ...payload, deviceIds });
};

export const deleteDevice = async (requestBody: AccountUniqueDeviceDto) => {
  const { serialNumber, accountId } = requestBody;
  const deviceObject = await authDeviceCheck({
    deviceIdentifier: serialNumber,
    accountId,
    relation: "owner",
  });

  const deviceId = deviceObject.device.id;

  const tuples = await read({
    object: `device:${deviceId}`,
    relation: `context`,
  });

  const deletes = [{
    user: SYSTEM,
    object: `device:${deviceId}`,
    relation: "system",
  }, {
    user: `user:${accountId}`,
    object: `device:${deviceId}`,
    relation: "owner",
  }];

  await deviceRepository.deleteDevice({
    serialNumber,
    accountId,
    deletes: [...deletes, ...tuples],
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
    relation: "can_edit",
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
  let device: Awaited<ReturnType<typeof authDeviceCheck>>;

  if ("deviceId" in query) {
    device = await authDeviceCheck({
      id: query.deviceId,
      accountId,
      relation: "can_write",
    });
  } else {
    device = await authDeviceCheck({
      deviceIdentifier: query.serialNumber,
      accountId,
      relation: "can_write",
    });
  }
  const firmwareHistory = await deviceRepository.getFirmwareHistory({
    ...query,
    id: device.device.id,
  });
  return firmwareHistory.map((
    { version, installedAt, createdAt, DeviceContext: { Context: { name } } },
  ) => ({
    version,
    installedAt,
    createdAt,
    contextName: name,
  }));
};

export const getChirpstackApplications = async () => {
  const {
    getApplications,
    closeConnection,
  } = getChirpstackConnection();

  const applications = await getApplications();
  closeConnection();
  return applications;
};

export const registerEui = async (body: RegisterEuiDto) => {
  const { deviceId, accountId, eui, joinEui, application } = body;
  const deviceDetails = await authDeviceCheck({
    id: deviceId,
    accountId,
    relation: "can_write",
  });

  const activeEui = await deviceRepository.getActiveEui({ deviceId });
  if (activeEui && activeEui.eui === eui) {
    return 200;
  }

  const {
    deviceService,
    metadata,
    getApplications,
    getDeviceProfile,
    closeConnection,
  } = getChirpstackConnection();

  const deviceApplication = application || "rriv";
  const applications = await getApplications();
  const applicationToUse = applications.find((a) =>
    a.name.toUpperCase() === deviceApplication.toUpperCase()
  );
  if (!applicationToUse) {
    throw new HttpException(422, "invalid application received");
  }
  const deviceProfile = await getDeviceProfile();

  const chirpstackDevice = new devicePb.Device();
  chirpstackDevice.setApplicationId(applicationToUse.id);
  chirpstackDevice.setDeviceProfileId(deviceProfile.id);
  chirpstackDevice.setName(deviceDetails.device.serialNumber);
  chirpstackDevice.setDevEui(eui);
  chirpstackDevice.setJoinEui(joinEui);

  const createDeviceRequest = new devicePb.CreateDeviceRequest();
  createDeviceRequest.setDevice(chirpstackDevice);

  const addDeviceToChirpstack = () =>
    new Promise((resolve, reject) => {
      deviceService.create(createDeviceRequest, metadata, (err, resp) => {
        if (err) {
          if (
            err.message ===
              '13 INTERNAL: duplicate key value violates unique constraint "device_pkey"'
          ) {
            reject(
              new HttpException(422, "device already added to chirpstack"),
            );
          } else {
            reject(err);
          }
        }

        resolve(resp?.toObject());
      });
    });

  await addDeviceToChirpstack();
  closeConnection();

  await deviceRepository.registerEui(body);
  return 201;
};

export const sendCommand = async (body: SendCommandDto) => {
  const { accountId, identifier, command } = body;
  const deviceDetails = await authDeviceCheck({
    deviceIdentifier: identifier,
    accountId,
    relation: "can_write",
  });

  const device = deviceDetails.device;
  if (!device) {
    throw new HttpException(404, "no device found with specified identifier");
  }

  const eui = device.DeviceEuis[0]?.eui;
  if (!eui) {
    throw new HttpException(422, "no active eui registered for device");
  }

  const { deviceService, metadata, closeConnection } =
    getChirpstackConnection();

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
  closeConnection();

  return { responseId };
};

export const getLogs = async (query: QueryLogsDto) => {
  const { identifier, accountId, ...sortingParam } = query;
  const deviceDetails = await authDeviceCheck({
    deviceIdentifier: identifier,
    accountId,
    relation: "can_write",
  });

  return await deviceRepository.getLogs({
    ...sortingParam,
    deviceId: deviceDetails.device.id,
  });
};

export const createLog = async (body: CreateLogDto) => {
  const { identifier, accountId, log } = body;
  const deviceDetails = await authDeviceCheck({
    deviceIdentifier: identifier,
    accountId,
    relation: "can_write",
  });
  await deviceRepository.createLog({
    accountId,
    log,
    deviceId: deviceDetails.device.id,
  });
};
