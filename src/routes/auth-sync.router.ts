import {
  getMetrics,
  listAuthSync,
  resyncFailed,
  resyncResource,
} from "../handler/auth-sync/handler.ts";
import { getExpressRouter } from "../utils/helper-functions.ts";

const router = getExpressRouter();
const routerWrapper = getExpressRouter();

router.get("/", listAuthSync);
router.post("/resync-failed", resyncFailed);
router.post("/:resourceType/:resourceId/resync", resyncResource);

routerWrapper.use("/admin/auth-sync", router);

const metricsRouter = getExpressRouter();
metricsRouter.get("/", getMetrics);
routerWrapper.use("/admin/metrics", metricsRouter);

export default routerWrapper;
