import { assertEquals } from "@std/assert";
import { resetDb } from "../support/db.ts";
import { startHarness } from "../support/harness.ts";
import {
  createAccount,
  createOwnedDeviceContext,
} from "../support/factories.ts";
import { assertRejectsWithCode } from "../support/assert.ts";
import {
  createSensorConfig,
  createSensorDriver,
} from "../../src/service/sensor.service.ts";
import { createDataloggerDriver } from "../../src/service/datalogger.service.ts";
import * as configSnapshotService from "../../src/service/config-snapshot.service.ts";

Deno.test("saveConfigSnapshot: saved names are unique and the list is saved-only", async () => {
  const harness = await startHarness();
  try {
    await resetDb();
    const { account, device, context } = await createOwnedDeviceContext();
    harness.authApi.seed([
      {
        user: `user:${account.id}`,
        relation: "owner",
        object: `context:${context.id}`,
      },
    ]);

    // Give the active snapshot at least one config so it can be saved.
    const driver = await createSensorDriver({
      name: "ds18b20",
      accountId: account.id,
      validation: { type: "object" },
    });
    await harness.asUser(account.id, () =>
      createSensorConfig({
        name: "temp",
        accountId: account.id,
        sensorDriverId: driver.id,
        config: { pin: 4 },
        deviceId: device.id,
        contextId: context.id,
        singlePropertyChange: false,
        createdAt: new Date(),
      }));

    await harness.asUser(
      account.id,
      () =>
        configSnapshotService.saveConfigSnapshot({
          name: "nightly",
          deviceId: device.id,
          contextId: context.id,
          accountId: account.id,
        }),
    );

    // Duplicate saved name -> 409.
    await assertRejectsWithCode(
      () =>
        harness.asUser(
          account.id,
          () =>
            configSnapshotService.saveConfigSnapshot({
              name: "nightly",
              deviceId: device.id,
              contextId: context.id,
              accountId: account.id,
            }),
        ),
      409,
    );

    // The list is scoped to kind = 'saved' (excludes the device-active snapshot).
    const saved = await configSnapshotService.getConfigSnapshots({
      accountId: account.id,
    });
    assertEquals(saved.length, 1);
    assertEquals(saved[0].name, "nightly");
    assertEquals((saved[0] as { kind?: string }).kind, "saved");
  } finally {
    await harness.stop();
  }
});

Deno.test("createConfigSnapshotLibraryConfig: duplicate name -> 409", async () => {
  const harness = await startHarness();
  try {
    await resetDb();
    const account = await createAccount();
    await createSensorDriver({
      name: "ds18b20",
      accountId: account.id,
      validation: { type: "object" },
    });
    // A datalogger driver is also needed for the default driver lookup.
    await createDataloggerDriver({
      name: "arduino",
      accountId: account.id,
      validation: { type: "object" },
    });

    await configSnapshotService.createConfigSnapshotLibraryConfig({
      name: "shared",
      accountId: account.id,
      datalogger: { sleep: 300 },
      sensors: [{ name: "temp", pin: 1 }],
    });
    await assertRejectsWithCode(
      () =>
        configSnapshotService.createConfigSnapshotLibraryConfig({
          name: "shared",
          accountId: account.id,
          datalogger: { sleep: 60 },
          sensors: [{ name: "temp", pin: 2 }],
        }),
      409,
    );
  } finally {
    await harness.stop();
  }
});
