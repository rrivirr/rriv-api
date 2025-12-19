import {
  createDataloggerConfig,
  createDataloggerDriver,
  createDataloggerLibraryConfig,
  createNewDataloggerLibraryConfigVersion,
  deleteDataloggerConfig,
  deleteDataloggerDriver,
  deleteDataloggerLibraryConfig,
  getDataloggerConfigHistory,
  getDataloggerDriver,
  getDataloggerLibraryConfig,
  getDataloggerLibraryConfigById,
} from "../handler/datalogger/handler.ts";
import { getExpressRouter } from "../utils/helper-functions.ts";
import "../swagger/datalogger/datalogger-config.document.ts";
import "../swagger/datalogger/datalogger-driver.document.ts";
import "../swagger/datalogger/datalogger-library.document.ts";

const router = getExpressRouter();
const routerWrapper = getExpressRouter();

router.route("/driver").post(createDataloggerDriver).get(getDataloggerDriver);
router.route("/driver/:id").delete(deleteDataloggerDriver);
router.route("/config").post(createDataloggerConfig);
router.route("/config/:id").delete(deleteDataloggerConfig);
router.route("/history").get(getDataloggerConfigHistory);
router.route("/libraryConfig").post(createDataloggerLibraryConfig).get(
  getDataloggerLibraryConfig,
);
router.route("/libraryConfig/:id/version").post(
  createNewDataloggerLibraryConfigVersion,
);
router.route("/libraryConfig/:id").get(getDataloggerLibraryConfigById).delete(
  deleteDataloggerLibraryConfig,
);

routerWrapper.use("/datalogger", router);

export default routerWrapper;
