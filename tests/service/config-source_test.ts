import { assert, assertEquals } from "@std/assert";
import { prisma, resetDb } from "../support/db.ts";
import { startHarness } from "../support/harness.ts";
import {
  createAccount,
  createOwnedDeviceContext,
} from "../support/factories.ts";
import { assertRejectsWithCode } from "../support/assert.ts";
import {
  createNewSensorLibraryConfigVersion,
  createSensorConfig,
  createSensorDriver,
  createSensorLibraryConfig,
  deactivateSensorConfig,
  getSensorConfigHistory,
} from "../../src/service/sensor.service.ts";
import {
  createDataloggerConfig,
  createDataloggerDriver,
  createDataloggerLibraryConfig,
  createNewDataloggerLibraryConfigVersion,
} from "../../src/service/datalogger.service.ts";
import {
  createConfigSnapshotLibraryConfig,
  getActiveConfig,
  getConfigSnapshots,
  saveConfigSnapshot,
} from "../../src/service/config-snapshot.service.ts";

type Harness = Awaited<ReturnType<typeof startHarness>>;

const setup = async (harness: Harness) => {
  await resetDb();
  const owned = await createOwnedDeviceContext();
  harness.authApi.seed([
    {
      user: `user:${owned.account.id}`,
      relation: "owner",
      object: `context:${owned.context.id}`,
    },
  ]);
  const sensorDriver = await createSensorDriver({
    name: "generic",
    accountId: owned.account.id,
    validation: { type: "object" },
  });
  const dataloggerDriver = await createDataloggerDriver({
    name: "rriv",
    accountId: owned.account.id,
    validation: { type: "object" },
  });

  const { account, device, context } = owned;
  const sensor = (
    name: string,
    config: Record<string, unknown>,
    extra: {
      singlePropertyChange?: boolean;
      source?: { kind: "sensor" | "system"; versionId: string } | null;
      createdAt?: Date;
    } = {},
  ) =>
    harness.asUser(account.id, () =>
      createSensorConfig({
        name,
        config,
        accountId: account.id,
        sensorDriverId: sensorDriver.id,
        deviceId: device.id,
        contextId: context.id,
        singlePropertyChange: extra.singlePropertyChange ?? false,
        createdAt: extra.createdAt ?? new Date(),
        source: extra.source,
      }));
  const datalogger = (
    config: Record<string, unknown>,
    extra: {
      singlePropertyChange?: boolean;
      source?: { kind: "datalogger" | "system"; versionId: string } | null;
    } = {},
  ) =>
    harness.asUser(account.id, () =>
      createDataloggerConfig({
        name: "datalogger",
        config,
        accountId: account.id,
        dataloggerDriverId: dataloggerDriver.id,
        deviceId: device.id,
        contextId: context.id,
        singlePropertyChange: extra.singlePropertyChange ?? false,
        createdAt: new Date(),
        source: extra.source,
      }));
  const sensorRows = (name: string) =>
    prisma.sensorConfig.findMany({
      where: {
        name,
        ConfigSnapshot: { deviceContextId: owned.deviceContext.id },
      },
      orderBy: { createdAt: "asc" },
    });
  const dataloggerRows = () =>
    prisma.dataloggerConfig.findMany({
      where: { ConfigSnapshot: { deviceContextId: owned.deviceContext.id } },
      orderBy: { createdAt: "asc" },
    });
  const active = () =>
    harness.asUser(account.id, () =>
      getActiveConfig({
        accountId: account.id,
        deviceId: device.id,
        contextId: context.id,
      }));

  return {
    ...owned,
    sensorDriver,
    dataloggerDriver,
    sensor,
    datalogger,
    sensorRows,
    dataloggerRows,
    active,
  };
};

const sensorVersionId = async (libraryId: string, version: number) =>
  (await prisma.sensorLibraryConfigVersion.findFirstOrThrow({
    where: { sensorLibraryConfigId: libraryId, version },
  })).id;

// --- 5: identical uploads ---------------------------------------------------

Deno.test("an identical sensor upload is accepted and writes nothing", async () => {
  const harness = await startHarness();
  try {
    const t = await setup(harness);
    const first = await t.sensor("ph", { type: "ph", pin: 3 });
    const again = await t.sensor("ph", { pin: 3, type: "ph" });

    assertEquals(again.id, first.id);
    assert("unchanged" in again);
    assertEquals((await t.sensorRows("ph")).length, 1);

    // A single-property change to the value already stored is also a no-op.
    const same = await t.sensor("ph", { pin: 3 }, {
      singlePropertyChange: true,
    });
    assertEquals(same.id, first.id);
    assertEquals((await t.sensorRows("ph")).length, 1);

    // A real change still replaces the row.
    await t.sensor("ph", { type: "ph", pin: 4 });
    const rows = await t.sensorRows("ph");
    assertEquals(rows.length, 2);
    assertEquals(rows.map((r) => r.active), [false, true]);
  } finally {
    await harness.stop();
  }
});

Deno.test("an identical datalogger upload is accepted and writes nothing", async () => {
  const harness = await startHarness();
  try {
    const t = await setup(harness);
    const first = await t.datalogger({ logger_name: "a", interval: 15 });
    const again = await t.datalogger({ interval: 15, logger_name: "a" });
    assertEquals(again.id, first.id);
    assertEquals((await t.dataloggerRows()).length, 1);

    await t.datalogger({ interval: 30 }, { singlePropertyChange: true });
    assertEquals((await t.dataloggerRows()).length, 2);
  } finally {
    await harness.stop();
  }
});

// --- 2: library source ------------------------------------------------------

Deno.test("sensor source: set on apply, kept on edits, cleared on type change", async () => {
  const harness = await startHarness();
  try {
    const t = await setup(harness);
    const library = await createSensorLibraryConfig({
      name: "ph-probe",
      accountId: t.account.id,
      config: { type: "ph", pin: 3 },
      sensorName: "ph",
      sensorDriverId: t.sensorDriver.id,
    });
    const v1 = await sensorVersionId(library.id, 1);

    // Applied from v1.
    await t.sensor("ph", { type: "ph", pin: 3 }, {
      source: { kind: "sensor", versionId: v1 },
    });
    // Hand edit: the source is copied forward.
    await t.sensor("ph", { pin: 7 }, { singlePropertyChange: true });
    let rows = await t.sensorRows("ph");
    assertEquals(rows.length, 2);
    assertEquals(rows[1].sourceSensorLibraryConfigVersionId, v1);

    const { sensorConfig } = await t.active();
    assertEquals(sensorConfig[0].source, {
      kind: "sensor",
      versionId: v1,
      version: 1,
      libraryConfigId: library.id,
      name: "ph-probe",
      latestVersion: 1,
      updateAvailable: false,
      // pin 3 -> 7 by hand
      changedSettings: 1,
    });

    // Same settings, newer version: a new row records the apply (decided
    // 2026-11-23), even though no setting changed.
    await createNewSensorLibraryConfigVersion({
      id: library.id,
      accountId: t.account.id,
      config: { type: "ph", pin: 7 },
      sensorName: "ph",
      sensorDriverId: t.sensorDriver.id,
    });
    const v2 = await sensorVersionId(library.id, 2);
    await t.sensor("ph", { type: "ph", pin: 7 }, {
      source: { kind: "sensor", versionId: v2 },
    });
    rows = await t.sensorRows("ph");
    assertEquals(rows.length, 3);
    assertEquals(rows[2].sourceSensorLibraryConfigVersionId, v2);

    // The type changes under the same id: the source no longer applies.
    await t.sensor("ph", { type: "temperature", pin: 7 });
    rows = await t.sensorRows("ph");
    assertEquals(rows[3].sourceSensorLibraryConfigVersionId, null);
    assertEquals((await t.active()).sensorConfig[0].source, null);
  } finally {
    await harness.stop();
  }
});

Deno.test("sensor source is checked: readable, right kind, same type", async () => {
  const harness = await startHarness();
  try {
    const t = await setup(harness);
    const library = await createSensorLibraryConfig({
      name: "ph-probe",
      accountId: t.account.id,
      config: { type: "ph", pin: 3 },
      sensorName: "ph",
      sensorDriverId: t.sensorDriver.id,
    });
    const v1 = await sensorVersionId(library.id, 1);

    // Different sensor type from the library.
    await assertRejectsWithCode(
      () =>
        t.sensor("ph", { type: "temperature" }, {
          source: { kind: "sensor", versionId: v1 },
        }),
      422,
    );

    // Someone else's private library.
    const other = await createAccount();
    const theirs = await createSensorLibraryConfig({
      name: "private",
      accountId: other.id,
      config: { type: "ph", pin: 1 },
      sensorName: "ph",
      sensorDriverId: t.sensorDriver.id,
    });
    const theirVersion = await sensorVersionId(theirs.id, 1);
    await assertRejectsWithCode(
      () =>
        t.sensor("ph", { type: "ph", pin: 1 }, {
          source: { kind: "sensor", versionId: theirVersion },
        }),
      422,
    );

    // A datalogger version can't be a sensor's source.
    await createDataloggerLibraryConfig({
      name: "dl",
      dataloggerDriverId: t.dataloggerDriver.id,
      accountId: t.account.id,
      config: { interval: 15 },
    });
    const dlVersion = await prisma.dataloggerLibraryConfigVersion
      .findFirstOrThrow();
    await assertRejectsWithCode(
      () =>
        t.sensor("ph", { type: "ph", pin: 3 }, {
          // deno-lint-ignore no-explicit-any
          source: { kind: "datalogger" as any, versionId: dlVersion.id },
        }),
      422,
    );

    assertEquals((await t.sensorRows("ph")).length, 0);
  } finally {
    await harness.stop();
  }
});

Deno.test("whole-device apply: system source on sensors and datalogger", async () => {
  const harness = await startHarness();
  try {
    const t = await setup(harness);
    const library = await createConfigSnapshotLibraryConfig({
      name: "station",
      dataloggerDriverId: t.dataloggerDriver.id,
      accountId: t.account.id,
      datalogger: { interval: 15 },
      sensors: [{
        name: "ph",
        sensorDriverId: t.sensorDriver.id,
        type: "ph",
        pin: 3,
      }],
    });
    const version = await prisma.systemLibraryConfigVersion.findFirstOrThrow({
      where: { systemLibraryConfigId: library.id },
    });
    const source = { kind: "system" as const, versionId: version.id };

    await t.datalogger({ interval: 15 }, { source });
    await t.sensor("ph", { type: "ph", pin: 3 }, { source });

    // A sensor the version doesn't have can't claim it as a source.
    await assertRejectsWithCode(
      () => t.sensor("ec", { type: "ec" }, { source }),
      422,
    );

    const { dataloggerConfig, sensorConfig } = await t.active();
    assertEquals(dataloggerConfig.source?.kind, "system");
    assertEquals(dataloggerConfig.source?.name, "station");
    assertEquals(dataloggerConfig.source?.changedSettings, 0);
    assertEquals(sensorConfig[0].source?.versionId, version.id);
    assertEquals(sensorConfig[0].source?.changedSettings, 0);

    // Datalogger hand edit keeps the source.
    await t.datalogger({ interval: 60 }, { singlePropertyChange: true });
    const rows = await t.dataloggerRows();
    assertEquals(rows.at(-1)!.sourceSystemLibraryConfigVersionId, version.id);
  } finally {
    await harness.stop();
  }
});

Deno.test("datalogger source from a datalogger library", async () => {
  const harness = await startHarness();
  try {
    const t = await setup(harness);
    const library = await createDataloggerLibraryConfig({
      name: "dl",
      dataloggerDriverId: t.dataloggerDriver.id,
      accountId: t.account.id,
      config: { interval: 15 },
    });
    const version = await prisma.dataloggerLibraryConfigVersion
      .findFirstOrThrow({
        where: { dataloggerLibraryConfigId: library.id },
      });
    await t.datalogger({ interval: 15 }, {
      source: { kind: "datalogger", versionId: version.id },
    });
    assertEquals((await t.active()).dataloggerConfig.source, {
      kind: "datalogger",
      versionId: version.id,
      version: 1,
      libraryConfigId: library.id,
      name: "dl",
      latestVersion: 1,
      updateAvailable: false,
      changedSettings: 0,
    });

    // A newer version is published: the device's source says so.
    await createNewDataloggerLibraryConfigVersion({
      id: library.id,
      dataloggerDriverId: t.dataloggerDriver.id,
      accountId: t.account.id,
      config: { interval: 30 },
    });
    const after = (await t.active()).dataloggerConfig.source;
    assertEquals(after?.latestVersion, 2);
    assertEquals(after?.updateAvailable, true);
  } finally {
    await harness.stop();
  }
});

// --- 4: removed sensors -----------------------------------------------------

Deno.test("removing a sensor ends its row; point-in-time reads respect it", async () => {
  const harness = await startHarness();
  try {
    const t = await setup(harness);
    const t0 = new Date(Date.now() - 60_000);
    const removedAt = new Date(Date.now() - 30_000);
    await t.sensor("ph", { type: "ph", pin: 3 }, { createdAt: t0 });
    await t.sensor("ec", { type: "ec", pin: 4 }, { createdAt: t0 });

    const ended = await harness.asUser(
      t.account.id,
      () =>
        deactivateSensorConfig({
          name: "ph",
          accountId: t.account.id,
          deviceId: t.device.id,
          contextId: t.context.id,
          deactivatedAt: removedAt,
        }),
    );
    assertEquals(ended?.active, false);
    assertEquals(ended?.deactivatedAt?.getTime(), removedAt.getTime());
    // Kept as history, not archived.
    assertEquals(
      await prisma.sensorConfig.count({
        where: { id: ended!.id, archivedAt: null },
      }),
      1,
    );

    // Ending it again (or a sensor never synced) is fine and does nothing.
    const again = await harness.asUser(
      t.account.id,
      () =>
        deactivateSensorConfig({
          name: "ph",
          accountId: t.account.id,
          deviceId: t.device.id,
          contextId: t.context.id,
        }),
    );
    assertEquals(again, null);

    assertEquals(
      (await t.active()).sensorConfig.map((s) => s.name),
      ["ec"],
    );

    const at = (asAt: Date) =>
      harness.asUser(t.account.id, () =>
        getSensorConfigHistory({
          accountId: t.account.id,
          deviceIdentifier: t.device.serialNumber,
          asAt,
          deviceValidated: true,
        }));
    const names = (rows: { name: string }[]) => rows.map((r) => r.name).sort();
    assertEquals(names(await at(new Date(t0.getTime() + 1_000))), ["ec", "ph"]);
    assertEquals(names(await at(new Date())), ["ec"]);

    // Added back under the same id: current again, with no source.
    await t.sensor("ph", { type: "ph", pin: 5 });
    assertEquals(names(await at(new Date(Date.now() + 1_000))), ["ec", "ph"]);
  } finally {
    await harness.stop();
  }
});

Deno.test("removing a sensor needs edit access to the device context", async () => {
  const harness = await startHarness();
  try {
    const t = await setup(harness);
    await t.sensor("ph", { type: "ph", pin: 3 });
    const stranger = await createAccount();
    await assertRejectsWithCode(
      () =>
        harness.asUser(stranger.id, () =>
          deactivateSensorConfig({
            name: "ph",
            accountId: stranger.id,
            deviceId: t.device.id,
            contextId: t.context.id,
          })),
      403,
    );
    assertEquals((await t.sensorRows("ph"))[0].active, true);
  } finally {
    await harness.stop();
  }
});

// --- 1: firmware version on library versions ---------------------------------

Deno.test("library versions keep the firmware version they were saved with", async () => {
  const harness = await startHarness();
  try {
    const t = await setup(harness);
    const sensorLibrary = await createSensorLibraryConfig({
      name: "ph-probe",
      accountId: t.account.id,
      config: { type: "ph", pin: 3 },
      sensorName: "ph",
      sensorDriverId: t.sensorDriver.id,
      firmwareVersion: "1.4.0",
    });
    await createNewSensorLibraryConfigVersion({
      id: sensorLibrary.id,
      accountId: t.account.id,
      config: { type: "ph", pin: 4 },
      sensorName: "ph",
      sensorDriverId: t.sensorDriver.id,
    });
    const sensorVersions = await prisma.sensorLibraryConfigVersion.findMany({
      where: { sensorLibraryConfigId: sensorLibrary.id },
      orderBy: { version: "asc" },
    });
    assertEquals(sensorVersions.map((v) => v.firmwareVersion), ["1.4.0", null]);

    const dlLibrary = await createDataloggerLibraryConfig({
      name: "dl",
      dataloggerDriverId: t.dataloggerDriver.id,
      accountId: t.account.id,
      config: { interval: 15 },
    });
    await createNewDataloggerLibraryConfigVersion({
      id: dlLibrary.id,
      dataloggerDriverId: t.dataloggerDriver.id,
      accountId: t.account.id,
      config: { interval: 30 },
      firmwareVersion: "1.5.2",
    });
    const dlVersions = await prisma.dataloggerLibraryConfigVersion.findMany({
      where: { dataloggerLibraryConfigId: dlLibrary.id },
      orderBy: { version: "asc" },
    });
    assertEquals(dlVersions.map((v) => v.firmwareVersion), [null, "1.5.2"]);

    const system = await createConfigSnapshotLibraryConfig({
      name: "station",
      dataloggerDriverId: t.dataloggerDriver.id,
      accountId: t.account.id,
      datalogger: { interval: 15 },
      sensors: [],
      firmwareVersion: "1.4.0",
    });
    const systemVersion = await prisma.systemLibraryConfigVersion
      .findFirstOrThrow({
        where: { systemLibraryConfigId: system.id },
      });
    assertEquals(systemVersion.firmwareVersion, "1.4.0");
  } finally {
    await harness.stop();
  }
});

// --- saved snapshots ----------------------------------------------------------

Deno.test("source: null clears the source (e.g. a saved snapshot applied)", async () => {
  const harness = await startHarness();
  try {
    const t = await setup(harness);
    const library = await createSensorLibraryConfig({
      name: "ph-probe",
      accountId: t.account.id,
      config: { type: "ph", pin: 3 },
      sensorName: "ph",
      sensorDriverId: t.sensorDriver.id,
    });
    const v1 = await sensorVersionId(library.id, 1);
    await t.sensor("ph", { type: "ph", pin: 3 }, {
      source: { kind: "sensor", versionId: v1 },
    });

    // Same settings, cleared source: a new row without a source.
    await t.sensor("ph", { type: "ph", pin: 3 }, { source: null });
    let rows = await t.sensorRows("ph");
    assertEquals(rows.length, 2);
    assertEquals(rows[1].sourceSensorLibraryConfigVersionId, null);

    // Again: nothing changes, nothing is written.
    await t.sensor("ph", { type: "ph", pin: 3 }, { source: null });
    rows = await t.sensorRows("ph");
    assertEquals(rows.length, 2);

    // Datalogger likewise.
    const dlLibrary = await createDataloggerLibraryConfig({
      name: "dl",
      dataloggerDriverId: t.dataloggerDriver.id,
      accountId: t.account.id,
      config: { interval: 15 },
    });
    const dlVersion = await prisma.dataloggerLibraryConfigVersion
      .findFirstOrThrow({
        where: { dataloggerLibraryConfigId: dlLibrary.id },
      });
    await t.datalogger({ interval: 15 }, {
      source: { kind: "datalogger", versionId: dlVersion.id },
    });
    await t.datalogger({ interval: 15 }, { source: null });
    const dlRows = await t.dataloggerRows();
    assertEquals(dlRows.length, 2);
    assertEquals(dlRows[1].sourceDataloggerLibraryConfigVersionId, null);
  } finally {
    await harness.stop();
  }
});

Deno.test("saved snapshots can be read back by id, only by their creator", async () => {
  const harness = await startHarness();
  try {
    const t = await setup(harness);
    await t.datalogger({ interval: 15 });
    await t.sensor("ph", { type: "ph", pin: 3 });
    const saved = await harness.asUser(t.account.id, () =>
      saveConfigSnapshot({
        name: "before-trip",
        accountId: t.account.id,
        deviceId: t.device.id,
        contextId: t.context.id,
      }));

    const [found] = await getConfigSnapshots({
      accountId: t.account.id,
      id: saved.id,
    });
    assertEquals(found.name, "before-trip");
    assertEquals(found.SensorConfig.map((s) => s.name), ["ph"]);
    assertEquals(found.DataloggerConfig.length, 1);

    const other = await createAccount();
    assertEquals(
      await getConfigSnapshots({ accountId: other.id, id: saved.id }),
      [],
    );
  } finally {
    await harness.stop();
  }
});
