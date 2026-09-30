import { assertEquals } from "@std/assert";
import { prisma, resetDb } from "../support/db.ts";
import { startHarness } from "../support/harness.ts";
import { startPgBoss } from "../support/pgboss.ts";
import { createAccount, createDevice } from "../support/factories.ts";
import { assertRejectsWithCode } from "../support/assert.ts";
import { bindDevice } from "../../src/service/device.service.ts";

Deno.test("bindDevice creates, is idempotent, and rejects another owner", async () => {
  await startPgBoss();
  const harness = await startHarness();
  try {
    await resetDb();
    const account = await createAccount();
    const other = await createAccount();
    const device = await createDevice(account.id, { serialNumber: "bind-001" });
    const activeBinds = () =>
      prisma.bind.count({ where: { deviceId: device.id, unboundAt: null } });

    // No owner tuple yet -> creates the bind.
    const bound = await harness.asUser(
      account.id,
      () => bindDevice({ serialNumber: "bind-001", accountId: account.id }),
    );
    assertEquals(bound.id, device.id);
    assertEquals(await activeBinds(), 1);

    // Owner tuple for the same account -> idempotent.
    harness.authApi.seed([
      {
        user: `user:${account.id}`,
        relation: "owner",
        object: `device:${device.id}`,
      },
    ]);
    await harness.asUser(
      account.id,
      () => bindDevice({ serialNumber: "bind-001", accountId: account.id }),
    );
    assertEquals(await activeBinds(), 1);

    // Owner tuple for a different account -> 409.
    harness.authApi.reset();
    harness.authApi.seed([
      {
        user: `user:${other.id}`,
        relation: "owner",
        object: `device:${device.id}`,
      },
    ]);
    await assertRejectsWithCode(
      () =>
        harness.asUser(
          account.id,
          () => bindDevice({ serialNumber: "bind-001", accountId: account.id }),
        ),
      409,
    );
  } finally {
    await harness.stop();
  }
});
