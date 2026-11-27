import { setLibraryOfficial } from "../handler/admin/handler.ts";
import { getExpressRouter } from "../utils/helper-functions.ts";
import { libraryBasePath } from "../swagger/admin/document.ts";

const router = getExpressRouter();
const routerWrapper = getExpressRouter();

router.patch("/:kind/:id", setLibraryOfficial);

routerWrapper.use(libraryBasePath, router);

export default routerWrapper;
