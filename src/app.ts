// @deno-types="npm:@types/express@5"
import express, { NextFunction, Request, Response } from "npm:express";
// @deno-types="npm:@types/swagger-ui-express"
import swaggerUi from "npm:swagger-ui-express";
import { HttpException } from "./utils/http-exception.ts";
import errorHandler from "./utils/error-handler.ts";
import routes from "./routes/index.ts";
import { swaggerBuilder } from "./swagger/index.ts";

const app = express();

app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.method === "POST" || req.method === "PATCH" || req.method === "PUT") {
    if (req.headers["content-type"] !== "application/json") {
      throw new HttpException(
        415,
        "Invalid content type. API only supports application/json"
      );
    }
  }
  next();
});

app.use(
  "/documentation",
  swaggerUi.serve,
  swaggerUi.setup(swaggerBuilder.getSpec())
);

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(routes);
app.use(errorHandler);

app.get(/(.*)/, function (_req: Request, res: Response) {
  res.status(200).send("not found");
});
export default app;
