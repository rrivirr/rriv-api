import {
  createNewSensorLibraryConfigVersion,
  createSensorConfig,
  createSensorDriver,
  createSensorLibraryConfig,
  deleteSensorConfig,
  deleteSensorDriver,
  deleteSensorLibraryConfig,
  getSensorDriver,
  getSensorLibraryConfig,
  getSensorLibraryConfigById,
} from "../handler/sensor/handler.ts";
import { getExpressRouter } from "../utils/helper-functions.ts";
import "../swagger/sensor/sensor-config.document.ts";
import "../swagger/sensor/sensor-driver.document.ts";
import "../swagger/sensor/sensor-library.document.ts";

const router = getExpressRouter();
const routerWrapper = getExpressRouter();

router.route("/driver").post(createSensorDriver).get(getSensorDriver);
router.route("/driver/:id").delete(deleteSensorDriver);
router.route("/config").post(createSensorConfig);
router.route("/config/:id").delete(deleteSensorConfig);
router.route("/libraryConfig").post(createSensorLibraryConfig).get(
  getSensorLibraryConfig,
);
router.route("/libraryConfig/:id/version").post(
  createNewSensorLibraryConfigVersion,
);
router.route("/libraryConfig/:id").get(getSensorLibraryConfigById).delete(
  deleteSensorLibraryConfig,
);

routerWrapper.use("/sensor", router);

export default routerWrapper;
