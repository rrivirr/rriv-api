import app from "./app.ts";
import config from "./infra/get-config.ts";
import pgBoss from "./infra/pg-boss/pg-boss.ts";
import { QUEUE_NAME } from "./infra/pg-boss/constants.ts";
import { recreateQueues } from "./infra/pg-boss/queues.ts";
import { worker } from "./infra/pg-boss/worker.ts";

const port = config.NODE_PORT || 3006;

await pgBoss.start();

await recreateQueues(pgBoss);

await pgBoss.work(QUEUE_NAME, worker);

app.listen(port, () => {
  console.log(`running on port ${port}`);
});
