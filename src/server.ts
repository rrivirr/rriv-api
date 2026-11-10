import process from "node:process";
import app from "./app.ts";
import config from "./infra/get-config.ts";
import pgBoss from "./infra/pg-boss/pg-boss.ts";
import prisma from "./infra/prisma.ts";
import { QUEUE_NAME } from "./infra/pg-boss/constants.ts";
import { recreateQueues } from "./infra/pg-boss/queues.ts";
import { worker } from "./infra/pg-boss/worker.ts";
import { createShutdown } from "./utils/graceful-shutdown.ts";

const port = config.NODE_PORT || 3006;

await pgBoss.start();

await recreateQueues(pgBoss);

await pgBoss.work(QUEUE_NAME, worker);

const server = app.listen(port, () => {
  console.log(`running on port ${port}`);
});

const shutdown = createShutdown({
  server,
  // Waits for running jobs, then marks any still running as failed so they
  // are retried right away instead of after they expire.
  stopWorkers: () => pgBoss.stop({ graceful: true, timeout: 15_000 }),
  disconnect: () => prisma.$disconnect(),
});

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
