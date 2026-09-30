import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../handler/notification/handler.ts";
import { getExpressRouter } from "../utils/helper-functions.ts";

const router = getExpressRouter();
const routerWrapper = getExpressRouter();

router.get("/", listNotifications);
router.post("/read-all", markAllNotificationsRead);
router.post("/:id/read", markNotificationRead);

routerWrapper.use("/notification", router);

export default routerWrapper;
