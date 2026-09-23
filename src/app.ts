// @deno-types="npm:@types/express@5"
import express, { NextFunction, Request, Response } from "npm:express";
import { HttpException } from "./utils/http-exception.ts";
import errorHandler from "./utils/error-handler.ts";
import routes from "./routes/index.ts";
import { swaggerBuilder } from "./swagger/index.ts";
import { jwtMiddleware } from "./utils/middleware/jwt.middleware.ts";
import pgBoss from "./infra/pg-boss/pg-boss.ts";
import { QUEUE_NAME } from "./infra/pg-boss/constants.ts";
import { worker } from "./infra/pg-boss/worker.ts";

const app = express();
const specJson = swaggerBuilder.getSpecAsJson();
const specYaml = swaggerBuilder.getSpecAsYaml();

app.get(
  "/version",
  (_req: Request, res: Response) => res.redirect("/version.yaml"),
);
app.get("/version.json", (_req: Request, res: Response) => {
  res.type("application/json").json(JSON.parse(specJson));
});
app.get("/version.yaml", (_req: Request, res: Response) => {
  res.type("application/yaml").send(specYaml);
});
app.use(jwtMiddleware);

app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.method === "POST" || req.method === "PATCH" || req.method === "PUT") {
    if (req.headers["content-type"] !== "application/json") {
      throw new HttpException(
        415,
        "Invalid content type. API only supports application/json",
      );
    }
  }
  next();
});

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(routes);
app.use(errorHandler);

await pgBoss.start();
await pgBoss.createQueue(QUEUE_NAME, {
  policy: "key_strict_fifo",
  retryLimit: 3,
  retryBackoff: true,
});
await pgBoss.work(QUEUE_NAME, worker);

export default app;
