import {
  createAccount,
  resetPassword,
  verifyEmail,
} from "../handler/account/handler.ts";
import { getExpressRouter } from "../utils/helper-functions.ts";
import "../swagger/account/account.document.ts";

const router = getExpressRouter();
const routerWrapper = getExpressRouter();

router.route("/").post(createAccount);
router.route("/verifyEmail").post(resetPassword);
router.route("/resetPassword").post(verifyEmail);

routerWrapper.use("/account", router);

export default routerWrapper;
