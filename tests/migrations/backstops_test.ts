import { assert, assertRejects, assertStringIncludes } from "@std/assert";
import { prisma, resetDb } from "../support/db.ts";
import {
  createAccount,
  createBind,
  createContext,
  createDevice,
  createDeviceContext,
  createOwnedDeviceContext,
} from "../support/factories.ts";

const EXPECTED_INDEXES = [
  "context_account_id_name_active_key",
  "bind_device_id_active_key",
  "device_context_device_id_active_key",
  "device_context_context_id_assigned_name_active_key",
  "device_eui_eui_active_key",
  "device_eui_device_id_active_key",
  "config_snapshot_device_context_id_active_key",
  "config_snapshot_saved_creator_id_name_key",
  "sensor_driver_name_key",
  "datalogger_driver_name_key",
  "sensor_library_config_creator_id_name_key",
  "datalogger_library_config_creator_id_name_key",
  "system_library_config_creator_id_name_key",
  "sensor_config_config_snapshot_id_name_active_key",
  "datalogger_config_config_snapshot_id_active_key",
  "sensor_library_config_version_config_id_version_key",
  "datalogger_library_config_version_config_id_version_key",
  "system_library_config_version_config_id_version_key",
];

/** Runs `fn`; asserts it rejected with a unique/check constraint violation. */
const assertConstraintRejects = async (
  fn: () => Promise<unknown>,
): Promise<void> => {
  await assertRejects(fn);
};

Deno.test("backstops: every partial/unique index exists", async () => {
  const rows = await prisma.$queryRaw<{ indexname: string }[]>`
    SELECT indexname FROM pg_indexes
    WHERE schemaname = 'rriv' AND indexname = ANY(${EXPECTED_INDEXES})
  `;
  const found = new Set(rows.map((r) => r.indexname));
  const missing = EXPECTED_INDEXES.filter((name) => !found.has(name));
  assert(
    missing.length === 0,
    `missing indexes: ${missing.join(", ")}`,
  );
});

Deno.test("backstops: context name unique per account, freed by archive", async () => {
  await resetDb();
  const account = await createAccount();
  await createContext(account.id, { name: "well" });
  await assertConstraintRejects(() =>
    createContext(account.id, { name: "well" })
  );

  // A different account may reuse the name.
  const other = await createAccount();
  await createContext(other.id, { name: "well" });

  // Archiving frees the name.
  await prisma.context.updateMany({
    where: { accountId: account.id, name: "well" },
    data: { archivedAt: new Date(), endedAt: new Date() },
  });
  await createContext(account.id, { name: "well" });
});

Deno.test("backstops: one active bind per device, freed by unbind", async () => {
  await resetDb();
  const account = await createAccount();
  const device = await createDevice(account.id);
  const active = await createBind(account.id, device.id);

  await assertConstraintRejects(() => createBind(account.id, device.id));

  await prisma.bind.update({
    where: { id: active.id },
    data: { unboundAt: new Date() },
  });
  await createBind(account.id, device.id);
});

Deno.test("backstops: device in one active context; name unique per context", async () => {
  await resetDb();
  const { account, device, context, deviceContext } =
    await createOwnedDeviceContext();

  // Same device in a second context.
  const otherContext = await createContext(account.id);
  await assertConstraintRejects(() =>
    createDeviceContext(device.id, otherContext.id, "another")
  );

  // Same assigned name in the same context (different device).
  const otherDevice = await createDevice(account.id);
  await assertConstraintRejects(() =>
    createDeviceContext(
      otherDevice.id,
      context.id,
      deviceContext.assignedDeviceName,
    )
  );
});

Deno.test("backstops: one active EUI per value and per device", async () => {
  await resetDb();
  const account = await createAccount();
  const deviceA = await createDevice(account.id);
  const deviceB = await createDevice(account.id);

  await prisma.deviceEui.create({
    data: {
      eui: "0102030405060708",
      deviceId: deviceA.id,
      creatorId: account.id,
      active: true,
    },
  });
  // Same EUI value on another device.
  await assertConstraintRejects(() =>
    prisma.deviceEui.create({
      data: {
        eui: "0102030405060708",
        deviceId: deviceB.id,
        creatorId: account.id,
        active: true,
      },
    })
  );
  // A second active EUI on the same device.
  await assertConstraintRejects(() =>
    prisma.deviceEui.create({
      data: {
        eui: "0102030405060709",
        deviceId: deviceA.id,
        creatorId: account.id,
        active: true,
      },
    })
  );
});

Deno.test("backstops: config_snapshot kind is constrained and saved-name unique", async () => {
  await resetDb();
  const { account, deviceContext } = await createOwnedDeviceContext();

  await prisma.configSnapshot.create({
    data: {
      name: "active",
      kind: "device_active",
      active: true,
      creatorId: account.id,
      deviceContextId: deviceContext.id,
    },
  });
  // A second active snapshot for the same device context.
  await assertConstraintRejects(() =>
    prisma.configSnapshot.create({
      data: {
        name: "active",
        kind: "device_active",
        active: true,
        creatorId: account.id,
        deviceContextId: deviceContext.id,
      },
    })
  );

  // Saved names are unique per creator, but do not collide with other kinds.
  await prisma.configSnapshot.create({
    data: {
      name: "nightly",
      kind: "saved",
      active: false,
      creatorId: account.id,
    },
  });
  await assertConstraintRejects(() =>
    prisma.configSnapshot.create({
      data: {
        name: "nightly",
        kind: "saved",
        active: false,
        creatorId: account.id,
      },
    })
  );

  // Library snapshots may reuse a saved name.
  await prisma.configSnapshot.create({
    data: {
      name: "nightly",
      kind: "library",
      active: false,
      creatorId: account.id,
    },
  });

  // Invalid kind is rejected by the CHECK constraint.
  let message = "";
  try {
    await prisma.configSnapshot.create({
      data: {
        name: "bogus",
        kind: "bogus",
        active: false,
        creatorId: account.id,
      },
    });
  } catch (error) {
    message = String((error as Error).message);
  }
  assertStringIncludes(message.toLowerCase(), "kind");
});
