import {
  getSignedFirmwareImage,
  listFirmwareReleases,
} from "../handler/firmware/handler.ts";
import { getExpressRouter } from "../utils/helper-functions.ts";
import "../swagger/firmware/document.ts";

const router = getExpressRouter();
const routerWrapper = getExpressRouter();

router.get("/releases", listFirmwareReleases);
router.get("/releases/:version/image", getSignedFirmwareImage);

routerWrapper.use("/firmware", router);

export default routerWrapper;
