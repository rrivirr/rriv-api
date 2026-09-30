import { assert, assertEquals, assertRejects } from "@std/assert";
import { prisma, resetDb } from "../support/db.ts";
import { startHarness } from "../support/harness.ts";
import { dlqJobCount, startPgBoss } from "../support/pgboss.ts";
import { createAccount, createContext } from "../support/factories.ts";
import { worker } from "../../src/infra/pg-boss/worker.ts";

const jobFor = (resourceId: string) =>
  ({
    id: crypto.randomUUID(),
    name: "rriv",
    data: {
      type: "AUTH_SYNC",
      payload: { resourceType: "context", resourceId, version: 1 },
    },
  }) as never;

Deno.test("worker: transient auth failure is recorded and rethrown", async () => {
  const harness = await startHarness();
  try {
    await resetDb();
    const account = await createAccount();
    const context = await createContext(account.id);
    await prisma.authSync.create({
      data: { resourceType: "context", resourceId: context.id },
    });
    harness.authApi.failNext([503]);

    await assertRejects(() => worker([jobFor(context.id)]));

    const sync = await prisma.authSync.findFirst({
      where: { resourceType: "context", resourceId: context.id },
    });
    assertEquals(sync?.status, "failed");
    assert((sync?.attempts ?? 0) >= 1);
  } finally {
    await harness.stop();
  }
});

Deno.test("worker: permanent auth failure goes to the DLQ and notifies the owner", async () => {
  await startPgBoss();
  const harness = await startHarness();
  try {
    await resetDb();
    const account = await createAccount();
    const context = await createContext(account.id);
    await prisma.authSync.create({
      data: { resourceType: "context", resourceId: context.id },
    });
    harness.authApi.failNext([400]);

    const before = await dlqJobCount();
    await worker([jobFor(context.id)]);
    const after = await dlqJobCount();

    assert(after > before, "expected a job in the dead-letter queue");
    const sync = await prisma.authSync.findFirst({
      where: { resourceType: "context", resourceId: context.id },
    });
    assertEquals(sync?.status, "failed");
    assert(
      await prisma.notification.count({ where: { accountId: account.id } }) >=
        1,
    );
  } finally {
    await harness.stop();
  }
});
