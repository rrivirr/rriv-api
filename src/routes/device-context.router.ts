import {
  createDeviceContext,
  deleteDeviceContext,
  updateDeviceContext,
} from "../handler/device-context/handler.ts";
import { path } from "../swagger/device-context/document.ts";
import { getExpressRouter } from "../utils/helper-functions.ts";

const router = getExpressRouter();

router.route(path)
  .post(createDeviceContext)
  .patch(updateDeviceContext)
  .delete(deleteDeviceContext);

export default router;
