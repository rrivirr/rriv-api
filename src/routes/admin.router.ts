import { grantRole, listRoles, revokeRole } from "../handler/admin/handler.ts";
import { getExpressRouter } from "../utils/helper-functions.ts";

const router = getExpressRouter();
const routerWrapper = getExpressRouter();

router.get("/", listRoles);
router.post("/", grantRole);
router.delete("/:role/:id", revokeRole);

routerWrapper.use("/admin/roles", router);

export default routerWrapper;
