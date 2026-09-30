import {
  grantAdmin,
  listAdmins,
  revokeAdmin,
} from "../handler/admin/handler.ts";
import { getExpressRouter } from "../utils/helper-functions.ts";

const router = getExpressRouter();
const routerWrapper = getExpressRouter();

router.get("/", listAdmins);
router.post("/", grantAdmin);
router.delete("/:id", revokeAdmin);

routerWrapper.use("/admin/admins", router);

export default routerWrapper;
