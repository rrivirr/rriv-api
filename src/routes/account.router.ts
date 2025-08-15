import { createAccount } from "../handler/account/handler.ts";
import { getExpressRouter } from "../utils/helper-functions.ts";
import "../swagger/account/account.document.ts";

const router = getExpressRouter();
const routerWrapper = getExpressRouter();

router.route("/").post(createAccount);

routerWrapper.use("/account", router);

export default routerWrapper;
