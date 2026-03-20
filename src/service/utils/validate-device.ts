import { DeviceIdentifierDto } from "../../types/device.types.ts";
import { IdDto } from "../../types/generic.types.ts";
import { HttpException } from "../../utils/http-exception.ts";
import { getDeviceByIdentifierOrId } from "../device.service.ts";

export const validateDevice = async (
  body: (DeviceIdentifierDto | IdDto) & { accountId: string },
) => {
  const { accountId, ...deviceQuery } = body;

  const deviceObject = await getDeviceByIdentifierOrId(deviceQuery);

  if (!deviceObject) {
    throw new HttpException(404, "device not found");
  }
  const { activeBind } = deviceObject;

  if (!activeBind || activeBind.accountId !== accountId) {
    throw new HttpException(404, "device not found");
  }

  return { ...deviceObject, activeBind };
};
