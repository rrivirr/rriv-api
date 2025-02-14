import { SerialNumberDeviceDto } from "../../types/device.types.ts";
import { IdDto } from "../../types/generic.types.ts";
import { isId } from "../../utils/helper-functions.ts";
import { getDeviceBySerialNumberOrId } from "../device.service.ts";

export const validateDevice = async (
  body: (SerialNumberDeviceDto | IdDto) & { accountId: string },
) => {
  const { accountId } = body;

  const deviceObject = await getDeviceBySerialNumberOrId({
    ...(isId(body) ? { id: body.id } : { serialNumber: body.serialNumber }),
  });

  if (!deviceObject) {
    return false;
  }
  const { activeBind } = deviceObject;

  if (!activeBind || activeBind.accountId !== accountId) {
    return false;
  }

  return { ...deviceObject, activeBind };
};
