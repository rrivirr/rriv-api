import { SerialNumberDeviceDto } from "../../types/device.types.ts";
import { IdDto } from "../../types/generic.types.ts";
import { isId } from "../../utils/helper-functions.ts";
import { HttpException } from "../../utils/http-exception.ts";
import { getDeviceBySerialNumberOrId } from "../device.service.ts";

export const validateDevice = async (
  body: (SerialNumberDeviceDto | IdDto) & { accountId: string },
) => {
  const { accountId } = body;

  const deviceObject = await getDeviceBySerialNumberOrId({
    ...(isId(body) ? { id: body.id } : { serialNumber: body.serialNumber }),
  });

  if (!deviceObject) {
    throw new HttpException(404, "device not found");
  }
  const { activeBind } = deviceObject;

  if (!activeBind || activeBind.accountId !== accountId) {
    throw new HttpException(404, "device not found");
  }

  return { ...deviceObject, activeBind };
};
