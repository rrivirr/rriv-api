import { HttpException } from "../../utils/http-exception.ts";
import { DeviceContextDto } from "../../types/context.types.ts";
import { authContextCheck } from "../context.service.ts";
import { getDeviceByIdentifierOrId } from "../../service/device.service.ts";

export const validateDeviceContext = async (
  body: DeviceContextDto & { relation: "owner" | "can_edit" },
) => {
  const { contextId, deviceId, accountId, relation } = body;

  await authContextCheck({ contextId, accountId, relation });
  const deviceDetails = await getDeviceByIdentifierOrId({ id: deviceId });

  if (!deviceDetails || !deviceDetails.activeBind) {
    throw new HttpException(404, "device not found");
  }
  const deviceContext = deviceDetails.activeDeviceContext;

  if (!deviceContext || deviceContext.contextId !== contextId) {
    throw new HttpException(422, "device not found in context");
  }
  return deviceContext;
};
