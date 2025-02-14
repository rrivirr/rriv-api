import {
  createContext,
  deleteContext,
  getContext,
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

routerWrapper.use(basePath, router);

export default routerWrapper;
