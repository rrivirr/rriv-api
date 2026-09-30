import { assert, assertEquals } from "@std/assert";
import { prisma, resetDb } from "../support/db.ts";
import { startHarness } from "../support/harness.ts";
import { startPgBoss } from "../support/pgboss.ts";
import {
  createAccount,
  createBind,
  createContext,
  createDevice,
  createDeviceContext,
} from "../support/factories.ts";
import { assertRejectsWithCode } from "../support/assert.ts";
import {
  createDeviceContext as createDeviceContextService,
  getDeviceContext,
  updateDeviceContext,
} from "../../src/service/device-context.service.ts";

const seedContext = (
  harness: Awaited<ReturnType<typeof startHarness>>,
  accountId: string,
  contextId: string,
) =>
  harness.authApi.seed([
    {
      user: `user:${accountId}`,
      relation: "owner",
      object: `context:${contextId}`,
    },
  ]);

Deno.test("createDeviceContext rejects a duplicate assigned name and a device already in a context", async () => {
  await startPgBoss();
  const harness = await startHarness();
  try {
    await resetDb();
    const account = await createAccount();
    const context = await createContext(account.id);
    const otherContext = await createContext(account.id);
    const inContext = await createDevice(account.id);
    const unassigned = await createDevice(account.id);
    await createBind(account.id, inContext.id);
    await createBind(account.id, unassigned.id);
    await createDeviceContext(inContext.id, context.id, "pump-a");
    harness.authApi.seed([
      {
        user: `user:${account.id}`,
        relation: "owner",
        object: `context:${context.id}`,
      },
      {
        user: `user:${account.id}`,
        relation: "owner",
        object: `context:${otherContext.id}`,
      },
      {
        user: `user:${account.id}`,
        relation: "owner",
        object: `device:${inContext.id}`,
      },
      {
        user: `user:${account.id}`,
        relation: "owner",
        object: `device:${unassigned.id}`,
      },
    ]);

    // Duplicate assigned name in the same context.
    await assertRejectsWithCode(
      () =>
        harness.asUser(account.id, () =>
          createDeviceContextService({
            contextId: context.id,
            deviceId: unassigned.id,
            accountId: account.id,
            assignedDeviceName: "pump-a",
          })),
      422,
    );

    // Device already active in another context.
    await assertRejectsWithCode(
      () =>
        harness.asUser(account.id, () =>
          createDeviceContextService({
            contextId: otherContext.id,
            deviceId: inContext.id,
            accountId: account.id,
            assignedDeviceName: "pump-c",
          })),
      422,
    );

    // Happy path: a free device joins the other context.
    await harness.asUser(account.id, () =>
      createDeviceContextService({
        contextId: otherContext.id,
        deviceId: unassigned.id,
        accountId: account.id,
        assignedDeviceName: "pump-c",
      }));
    assertEquals(
      await prisma.deviceContext.count({
        where: { deviceId: unassigned.id, endedAt: null, archivedAt: null },
      }),
      1,
    );
  } finally {
    await harness.stop();
  }
});

Deno.test("updateDeviceContext rename duplicate -> 422, end closes it", async () => {
  await startPgBoss();
  const harness = await startHarness();
  try {
    await resetDb();
    const account = await createAccount();
    const context = await createContext(account.id);
    const deviceA = await createDevice(account.id);
    const deviceB = await createDevice(account.id);
    await createBind(account.id, deviceA.id);
    await createBind(account.id, deviceB.id);
    await createDeviceContext(deviceA.id, context.id, "pump-a");
    const dcB = await createDeviceContext(deviceB.id, context.id, "pump-b");
    harness.authApi.seed([
      {
        user: `user:${account.id}`,
        relation: "owner",
        object: `context:${context.id}`,
      },
      {
        user: `user:${account.id}`,
        relation: "owner",
        object: `device:${deviceB.id}`,
      },
    ]);

    await assertRejectsWithCode(
      () =>
        harness.asUser(account.id, () =>
          updateDeviceContext({
            contextId: context.id,
            deviceId: deviceB.id,
            accountId: account.id,
            assignedDeviceName: "pump-a",
          })),
      422,
    );

    await harness.asUser(account.id, () =>
      updateDeviceContext({
        contextId: context.id,
        deviceId: deviceB.id,
        accountId: account.id,
        end: true,
      }));
    const ended = await prisma.deviceContext.findUniqueOrThrow({
      where: { id: dcB.id },
    });
    assert(ended.endedAt instanceof Date);
  } finally {
    await harness.stop();
  }
});

Deno.test("getDeviceContext lazily creates the device-active snapshot", async () => {
  const harness = await startHarness();
  try {
    await resetDb();
    const account = await createAccount();
    const context = await createContext(account.id);
    const device = await createDevice(account.id);
    await createBind(account.id, device.id);
    const dc = await createDeviceContext(device.id, context.id, "pump-a");
    seedContext(harness, account.id, context.id);

    const result = await harness.asUser(account.id, () =>
      getDeviceContext({
        contextId: context.id,
        deviceId: device.id,
        accountId: account.id,
      }));

    assert(result.configSnapshotId);
    assertEquals(
      await prisma.configSnapshot.count({
        where: { deviceContextId: dc.id, kind: "device_active", active: true },
      }),
      1,
    );
  } finally {
    await harness.stop();
  }
});
