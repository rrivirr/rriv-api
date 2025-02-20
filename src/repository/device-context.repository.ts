import prisma from "../infra/prisma.ts";
import {
  UniqueDeviceContextDto,
  UpdateDeviceContextDto,
} from "../types/context.types.ts";

export const getDeviceContext = async (
  body: { contextId: string; assignedDeviceName: string },
) => {
  const { contextId, assignedDeviceName } = body;

  return await prisma.deviceContext.findMany({
    where: { contextId, assignedDeviceName, archivedAt: null, endedAt: null },
  });
};

export const createDeviceContext = async (
  body: UniqueDeviceContextDto & { assignedDeviceName: string },
) => {
  return await prisma.deviceContext.create({
    data: { ...body },
  });
};

export const updateDeviceContext = async (body: UpdateDeviceContextDto) => {
  const { contextId, deviceId, assignedDeviceName, end } = body;

  return await prisma.deviceContext.updateMany({
    where: {
      deviceId,
      contextId,
      endedAt: null,
      archivedAt: null,
    },
    data: {
      assignedDeviceName,
      ...(end && { endedAt: new Date() }),
    },
  });
};

export const deleteDeviceContext = async (body: UniqueDeviceContextDto) => {
  const { contextId, deviceId } = body;

  return await prisma.deviceContext.updateMany({
    where: {
      deviceId,
      contextId,
      endedAt: null,
      archivedAt: null,
    },
    data: { archivedAt: new Date(), endedAt: new Date() },
  });
};
