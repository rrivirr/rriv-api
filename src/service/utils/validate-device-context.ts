import { HttpException } from "../../utils/http-exception.ts";
import { validateContext } from "./validate-context.ts";
import { validateDevice } from "./validate-device.ts";
import { DeviceContextDto } from "../../types/context.types.ts";

export const validateDeviceContext = async (body: DeviceContextDto) => {
  const { contextId, deviceId, accountId } = body;
  await validateContext({ contextId, accountId });

  const deviceObject = await validateDevice({ id: deviceId, accountId });
  const { activeDeviceContext } = deviceObject;

  if (!activeDeviceContext || activeDeviceContext.contextId !== contextId) {
    throw new HttpException(422, "device not found in context");
  }

  return activeDeviceContext;
};
