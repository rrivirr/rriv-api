import { assert, assertEquals } from "@std/assert";
import { prisma, resetDb } from "../support/db.ts";
import { startHarness } from "../support/harness.ts";
import { startPgBoss } from "../support/pgboss.ts";
import { createOwnedDeviceContext } from "../support/factories.ts";
import { desiredTuples } from "../../src/service/authorization-sync.service.ts";
import {
  deleteDevice,
  unbindDevice,
} from "../../src/service/device.service.ts";

Deno.test("unbindDevice ends the bind and device context", async () => {
  await startPgBoss();
  const harness = await startHarness();
  try {
    await resetDb();
    const { account, device, bind } = await createOwnedDeviceContext();
    harness.authApi.seed([
      {
        user: `user:${account.id}`,
        relation: "owner",
        object: `device:${device.id}`,
      },
    ]);

    await harness.asUser(account.id, () =>
      unbindDevice({
        serialNumber: device.serialNumber,
        accountId: account.id,
      }));

    const updated = await prisma.bind.findUniqueOrThrow({
      where: { id: bind.id },
    });
    assert(updated.unboundAt instanceof Date);
    const contexts = await prisma.deviceContext.findMany({
      where: { deviceId: device.id },
    });
    assert(contexts.every((row) => row.endedAt !== null));

    const tuples = await desiredTuples({ type: "account", id: account.id });
    assertEquals(
      tuples.some((t) =>
        t.relation === "owner" && t.object === `device:${device.id}`
      ),
      false,
    );
  } finally {
    await harness.stop();
  }
});

Deno.test("deleteDevice archives the device, binds and contexts", async () => {
  await startPgBoss();
  const harness = await startHarness();
  try {
    await resetDb();
    const { account, device } = await createOwnedDeviceContext();
    harness.authApi.seed([
      {
        user: `user:${account.id}`,
        relation: "owner",
        object: `device:${device.id}`,
      },
    ]);

    await harness.asUser(account.id, () =>
      deleteDevice({
        serialNumber: device.serialNumber,
        accountId: account.id,
      }));

    const row = await prisma.device.findUniqueOrThrow({
      where: { id: device.id },
      omit: { archivedAt: false },
    });
    assert(row.archivedAt instanceof Date);
    assertEquals(
      await prisma.deviceContext.count({
        where: { deviceId: device.id, archivedAt: null },
      }),
      0,
    );
  } finally {
    await harness.stop();
  }
});
