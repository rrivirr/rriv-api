import {
  grantAdmin,
  grantRole,
  listAdmins,
  listRoles,
  revokeAdmin,
  revokeRole,
} from "../handler/admin/handler.ts";
import { getExpressRouter } from "../utils/helper-functions.ts";

const router = getExpressRouter();
const rolesRouter = getExpressRouter();
const routerWrapper = getExpressRouter();

// Kept for existing callers; equivalent to the `admin` role below.
router.get("/", listAdmins);
router.post("/", grantAdmin);
router.delete("/:id", revokeAdmin);

rolesRouter.get("/", listRoles);
rolesRouter.post("/", grantRole);
rolesRouter.delete("/:role/:id", revokeRole);

routerWrapper.use("/admin/admins", router);
routerWrapper.use("/admin/roles", rolesRouter);

export default routerWrapper;
