import { prisma } from "./db.ts";

const uid = () => crypto.randomUUID();
const short = () => crypto.randomUUID().slice(0, 8);

export const createAccount = (overrides: {
  email?: string;
  firstName?: string;
  lastName?: string;
} = {}) =>
  prisma.account.create({
    data: {
      email: overrides.email ?? `${short()}@test.local`,
      firstName: overrides.firstName ?? "Test",
      lastName: overrides.lastName ?? "User",
    },
  });

export const createContext = (
  accountId: string,
  overrides: { name?: string } = {},
) =>
  prisma.context.create({
    data: { name: overrides.name ?? `ctx-${short()}`, accountId },
  });

export const createDevice = (
  provisionedBy: string,
  overrides: {
    serialNumber?: string;
    uniqueName?: string;
    type?: string;
  } = {},
) =>
  prisma.device.create({
    data: {
      serialNumber: overrides.serialNumber ?? `s${short()}`,
      uniqueName: overrides.uniqueName ?? `device-${short()}`,
      uid: uid(),
      type: overrides.type ?? "datalogger",
      provisionedBy,
    },
  });

export const createBind = (accountId: string, deviceId: string) =>
  prisma.bind.create({
    data: { accountId, deviceId },
  });

export const createDeviceContext = (
  deviceId: string,
  contextId: string,
  assignedDeviceName: string,
) =>
  prisma.deviceContext.create({
    data: { deviceId, contextId, assignedDeviceName },
  });

/** Account + context + bound device + active device context. */
export const createOwnedDeviceContext = async () => {
  const account = await createAccount();
  const context = await createContext(account.id);
  const device = await createDevice(account.id);
  const bind = await createBind(account.id, device.id);
  const deviceContext = await createDeviceContext(
    device.id,
    context.id,
    `dc-${short()}`,
  );
  return { account, context, device, bind, deviceContext };
};
