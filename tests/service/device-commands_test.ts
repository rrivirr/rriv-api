import { assertEquals } from "@std/assert";
import { prisma, resetDb } from "../support/db.ts";
import { startHarness } from "../support/harness.ts";
import { installFakeChirpstack } from "../support/chirpstack.ts";
import { createOwnedDeviceContext } from "../support/factories.ts";
import { assertRejectsWithCode } from "../support/assert.ts";
import {
  createFirmwareEntry,
  createLog,
  getFirmwareHistory,
  getLogs,
  sendCommand,
} from "../../src/service/device.service.ts";

Deno.test("sendCommand enqueues a downlink for the active EUI", async () => {
  const harness = await startHarness();
  const chirpstack = installFakeChirpstack();
  try {
    await resetDb();
    const { account, device } = await createOwnedDeviceContext();
    await prisma.deviceEui.create({
      data: {
        eui: "0102030405060701",
        deviceId: device.id,
        creatorId: account.id,
        active: true,
      },
    });
    harness.authApi.seed([
      {
        user: `user:${account.id}`,
        relation: "owner",
        object: `device:${device.id}`,
      },
    ]);

    const result = await harness.asUser(account.id, () =>
      sendCommand({
        accountId: account.id,
        identifier: device.serialNumber,
        command: "aGVsbG8=",
      }));

    assertEquals(chirpstack.enqueued.length, 1);
    assertEquals(result.responseId, "response-id");
  } finally {
    chirpstack.restore();
    await harness.stop();
  }
});

Deno.test("sendCommand rejects a device without an active EUI (422)", async () => {
  const harness = await startHarness();
  const chirpstack = installFakeChirpstack();
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

    await assertRejectsWithCode(
      () =>
        harness.asUser(account.id, () =>
          sendCommand({
            accountId: account.id,
            identifier: device.serialNumber,
            command: "x",
          })),
      422,
    );
  } finally {
    chirpstack.restore();
    await harness.stop();
  }
});

Deno.test("createFirmwareEntry + getFirmwareHistory", async () => {
  const harness = await startHarness();
  try {
    await resetDb();
    const { account, device, context } = await createOwnedDeviceContext();
    harness.authApi.seed([
      {
        user: `user:${account.id}`,
        relation: "owner",
        object: `device:${device.id}`,
      },
      {
        user: `user:${account.id}`,
        relation: "owner",
        object: `context:${context.id}`,
      },
    ]);

    const older = new Date(Date.now() - 2 * 3_600_000);
    const newer = new Date(Date.now() - 1 * 3_600_000);

    await harness.asUser(account.id, async () => {
      await createFirmwareEntry({
        deviceId: device.id,
        contextId: context.id,
        accountId: account.id,
        version: "1.4.2",
        installedAt: older,
      });
      await createFirmwareEntry({
        deviceId: device.id,
        contextId: context.id,
        accountId: account.id,
        version: "1.5.0",
        installedAt: newer,
      });
    });

    const history = await harness.asUser(account.id, () =>
      getFirmwareHistory({
        accountId: account.id,
        serialNumber: device.serialNumber,
        limit: 10,
        offset: 0,
        order: "asc",
        orderBy: "createdAt",
      }));
    assertEquals(history.length, 2);
    assertEquals(history[0].version, "1.4.2");
    assertEquals(history[0].contextName, context.name);

    // asAt reconstructs the firmware in effect at an instant: latest install
    // at or before the timestamp.
    const between = await harness.asUser(account.id, () =>
      getFirmwareHistory({
        accountId: account.id,
        serialNumber: device.serialNumber,
        limit: 10,
        offset: 0,
        order: "desc",
        orderBy: "createdAt",
        asAt: new Date(Date.now() - 90 * 60_000),
      }));
    assertEquals(between.length, 1);
    assertEquals(between[0].version, "1.4.2");

    const now = await harness.asUser(account.id, () =>
      getFirmwareHistory({
        accountId: account.id,
        serialNumber: device.serialNumber,
        limit: 10,
        offset: 0,
        order: "desc",
        orderBy: "createdAt",
        asAt: new Date(),
      }));
    assertEquals(now.length, 1);
    assertEquals(now[0].version, "1.5.0");

    // from/to scope the history to a window (chart markers); ignored by asAt.
    const windowed = await harness.asUser(account.id, () =>
      getFirmwareHistory({
        accountId: account.id,
        serialNumber: device.serialNumber,
        limit: 10,
        offset: 0,
        order: "asc",
        orderBy: "createdAt",
        from: new Date(Date.now() - 90 * 60_000),
      }));
    assertEquals(windowed.length, 1);
    assertEquals(windowed[0].version, "1.5.0");
  } finally {
    await harness.stop();
  }
});

Deno.test("createLog + getLogs", async () => {
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
      createLog({
        identifier: device.serialNumber,
        accountId: account.id,
        log: "booted",
      }));

    const logs = await harness.asUser(account.id, () =>
      getLogs({
        identifier: device.serialNumber,
        accountId: account.id,
        limit: 10,
        offset: 0,
        order: "desc",
        orderBy: "createdAt",
      }));
    assertEquals(logs.length, 1);
    assertEquals(logs[0].log, "booted");
  } finally {
    await harness.stop();
  }
});
