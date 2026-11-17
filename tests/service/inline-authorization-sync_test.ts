import { assert } from "@std/assert";
import { resetDb } from "../support/db.ts";
import { startHarness } from "../support/harness.ts";
import { startPgBoss } from "../support/pgboss.ts";
import {
  createAccount,
  createContext,
  createDevice,
} from "../support/factories.ts";
import { bindDevice } from "../../src/service/device.service.ts";
import { createDeviceContext } from "../../src/service/device-context.service.ts";
import { shareContext } from "../../src/service/context.service.ts";

// None of these tests seed tuples for the step under test or run the sync
// worker: whatever the next call needs must already be in OpenFGA when the
// previous call returns.

Deno.test("bind then add to a context back to back (rrivctl connect)", async () => {
  await startPgBoss();
  const harness = await startHarness();
  try {
    await resetDb();
    const account = await createAccount();
    const context = await createContext(account.id);
    const device = await createDevice(account.id, { serialNumber: "conn1" });
    harness.authApi.seed([
      {
        user: `user:${account.id}`,
        relation: "owner",
        object: `context:${context.id}`,
      },
    ]);

    await harness.asUser(
      account.id,
      () => bindDevice({ serialNumber: "conn1", accountId: account.id }),
    );
    assert(
      harness.authApi.has(
        `user:${account.id}`,
        "owner",
        `device:${device.id}`,
      ),
    );

    // Needs can_write on the device, which comes from the owner tuple.
    await harness.asUser(
      account.id,
      () =>
        createDeviceContext({
          contextId: context.id,
          deviceId: device.id,
          accountId: account.id,
          assignedDeviceName: "well-a",
        }),
    );
    assert(
      harness.authApi.has(
        `context:${context.id}`,
        "context",
        `device:${device.id}`,
      ),
    );
  } finally {
    await harness.stop();
  }
});

Deno.test("shareContext grants the editor tuple before returning", async () => {
  await startPgBoss();
  const harness = await startHarness();
  try {
    await resetDb();
    const owner = await createAccount();
    const editor = await createAccount();
    const context = await createContext(owner.id);
    harness.authApi.seed([
      {
        user: `user:${owner.id}`,
        relation: "owner",
        object: `context:${context.id}`,
      },
    ]);

    await harness.asUser(
      owner.id,
      () =>
        shareContext({
          id: context.id,
          accountId: owner.id,
          email: editor.email,
        }),
    );
    assert(
      harness.authApi.has(
        `user:${editor.id}`,
        "editor",
        `context:${context.id}`,
      ),
    );
  } finally {
    await harness.stop();
  }
});
