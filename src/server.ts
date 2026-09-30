import app from "./app.ts";
import config from "./infra/get-config.ts";
import pgBoss from "./infra/pg-boss/pg-boss.ts";
import { DLQ_NAME, QUEUE_NAME } from "./infra/pg-boss/constants.ts";
import { worker } from "./infra/pg-boss/worker.ts";

const port = config.NODE_PORT || 3006;

await pgBoss.start();

// Dead-letter queue: jobs that permanently fail (or exhaust retries) are
// copied here for inspection/retry. `retryLimit: 0` — nothing processes it.
await pgBoss.createQueue(DLQ_NAME, {
  policy: "standard",
  retryLimit: 0,
  retentionSeconds: 30 * 24 * 60 * 60,
});

// `stately` + singletonKey keeps at most one queued and one active job per
// resource (dedupe) and — unlike key_strict_fifo — does not block the resource
// while a job is failed, which is what made a single failure wedge a context.
await pgBoss.createQueue(QUEUE_NAME, {
  policy: "stately",
  retryLimit: 5,
  retryDelay: 15,
  retryBackoff: true,
  retryDelayMax: 60 * 60,
  deadLetter: DLQ_NAME,
});

await pgBoss.work(QUEUE_NAME, worker);

app.listen(port, () => {
  console.log(`running on port ${port}`);
});
