import {
  createContext,
  deleteContext,
  getContext,
  getSharedContexts,
  getShareRecipients,
  shareContext,
  updateContext,
} from "../handler/context/handler.ts";
import { basePath } from "../swagger/context/document.ts";
import { getExpressRouter } from "../utils/helper-functions.ts";

const router = getExpressRouter();
const routerWrapper = getExpressRouter();

router.get("/", getContext);
router.post("/", createContext);
router.patch("/:id", updateContext);
router.delete("/:id", deleteContext);
router.route("/:id/share").get(getShareRecipients).post(shareContext);
router.route("/shared").get(getSharedContexts);

routerWrapper.use(basePath, router);

export default routerWrapper;
