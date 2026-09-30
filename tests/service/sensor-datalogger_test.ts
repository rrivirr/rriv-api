import { assertEquals } from "@std/assert";
import { prisma, resetDb } from "../support/db.ts";
import { startHarness } from "../support/harness.ts";
import { createOwnedDeviceContext } from "../support/factories.ts";
import { assertRejectsWithCode } from "../support/assert.ts";
import {
  createNewSensorLibraryConfigVersion,
  createSensorConfig,
  createSensorDriver,
  createSensorLibraryConfig,
} from "../../src/service/sensor.service.ts";
import {
  createDataloggerConfig,
  createDataloggerDriver,
  createDataloggerLibraryConfig,
} from "../../src/service/datalogger.service.ts";

const seedOwner = (
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

Deno.test("sensor driver/createConfig/deactivate + library versions", async () => {
  const harness = await startHarness();
  try {
    await resetDb();
    const { account, device, context } = await createOwnedDeviceContext();
    seedOwner(harness, account.id, context.id);

    const driver = await createSensorDriver({
      name: "ds18b20",
      accountId: account.id,
      validation: {
        type: "object",
        properties: { pin: { type: "number" } },
        required: ["pin"],
      },
    });

    // Duplicate driver name -> 409.
    await assertRejectsWithCode(
      () =>
        createSensorDriver({
          name: "ds18b20",
          accountId: account.id,
          validation: { type: "object" },
        }),
      409,
    );

    // Create an active config, then a second with the same name deactivates it.
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
    await harness.asUser(account.id, () =>
      createSensorConfig({
        name: "temp",
        accountId: account.id,
        sensorDriverId: driver.id,
        config: { pin: 5 },
        deviceId: device.id,
        contextId: context.id,
        singlePropertyChange: false,
        createdAt: new Date(),
      }));
    const active = await prisma.sensorConfig.findMany({
      where: { name: "temp", active: true, archivedAt: null },
    });
    assertEquals(active.length, 1);
    assertEquals((active[0].config as { pin: number }).pin, 5);

    // Library config name uniqueness + version publishing.
    const library = await createSensorLibraryConfig({
      name: "shared-temp",
      accountId: account.id,
      config: { type: "temperature", pin: 1 },
      sensorName: "temp",
    });
    await assertRejectsWithCode(
      () =>
        createSensorLibraryConfig({
          name: "shared-temp",
          accountId: account.id,
          config: { type: "temperature", pin: 2 },
          sensorName: "temp",
        }),
      409,
    );
    // Same config as the latest version -> 409.
    await assertRejectsWithCode(
      () =>
        createNewSensorLibraryConfigVersion({
          id: library.id,
          accountId: account.id,
          config: { type: "temperature", pin: 1 },
          sensorName: "temp",
        }),
      409,
    );
    await createNewSensorLibraryConfigVersion({
      id: library.id,
      accountId: account.id,
      config: { type: "temperature", pin: 9 },
      sensorName: "temp",
    });
    assertEquals(
      await prisma.sensorLibraryConfigVersion.count({
        where: { sensorLibraryConfigId: library.id },
      }),
      2,
    );
  } finally {
    await harness.stop();
  }
});

Deno.test("datalogger driver/config + library name uniqueness", async () => {
  const harness = await startHarness();
  try {
    await resetDb();
    const { account, device, context } = await createOwnedDeviceContext();
    seedOwner(harness, account.id, context.id);

    const driver = await createDataloggerDriver({
      name: "arduino",
      accountId: account.id,
      validation: { type: "object" },
    });
    await assertRejectsWithCode(
      () =>
        createDataloggerDriver({
          name: "arduino",
          accountId: account.id,
          validation: { type: "object" },
        }),
      409,
    );

    await harness.asUser(account.id, () =>
      createDataloggerConfig({
        name: "default",
        accountId: account.id,
        dataloggerDriverId: driver.id,
        config: { sleep: 300 },
        deviceId: device.id,
        contextId: context.id,
        singlePropertyChange: false,
        createdAt: new Date(),
      }));
    assertEquals(
      await prisma.dataloggerConfig.count({
        where: { name: "default", active: true, archivedAt: null },
      }),
      1,
    );

    await createDataloggerLibraryConfig({
      name: "shared-dl",
      accountId: account.id,
      config: { sleep: 60 },
    });
    await assertRejectsWithCode(
      () =>
        createDataloggerLibraryConfig({
          name: "shared-dl",
          accountId: account.id,
          config: { sleep: 90 },
        }),
      409,
    );
  } finally {
    await harness.stop();
  }
});
