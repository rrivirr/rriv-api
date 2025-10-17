import {
  bindDevice,
  deleteDevice,
  getDevices,
  provisionDevice,
  unbindDevice,
} from "../handler/device/handler.ts";
import { basePath } from "../swagger/device/document.ts";
import { getExpressRouter } from "../utils/helper-functions.ts";

const router = getExpressRouter();
const routerWrapper = getExpressRouter();

router.get("/", getDevices);
router.post("/", provisionDevice);
router.post("/:serialNumber/bind", bindDevice);
router.post("/:serialNumber/unbind", unbindDevice);
router.delete("/:serialNumber", deleteDevice);

routerWrapper.use(basePath, router);

export default routerWrapper;
