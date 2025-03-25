import {
  createConfigSnapshotLibraryConfig,
  createNewConfigSnapshotLibraryConfigVersion,
  getActiveConfig,
  getConfigSnapshotHistory,
  getConfigSnapshotLibraryConfig,
  getConfigSnapshotLibraryConfigById,
  getConfigSnapshots,
  saveConfigSnapshot,
} from "../handler/config-snapshot/handler.ts";
import { getExpressRouter } from "../utils/helper-functions.ts";
import "../swagger/config-snapshot/config-snapshot-library.document.ts";
import "../swagger/config-snapshot/config-snapshot.document.ts";

const router = getExpressRouter();
const routerWrapper = getExpressRouter();

router.route("/").get(getConfigSnapshots);
router.route("/history").get(getConfigSnapshotHistory);
router.route("/active").get(getActiveConfig);
router.route("/save").post(saveConfigSnapshot);
router.route("/libraryConfig").post(createConfigSnapshotLibraryConfig).get(
  getConfigSnapshotLibraryConfig,
);
router.route("/libraryConfig/:id/version").post(
  createNewConfigSnapshotLibraryConfigVersion,
);
router.route("/libraryConfig/:id").get(getConfigSnapshotLibraryConfigById);

routerWrapper.use("/configSnapshot", router);

export default routerWrapper;
