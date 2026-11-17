import { assertEquals } from "@std/assert";
import { resetDb } from "../support/db.ts";
import { startPgBoss } from "../support/pgboss.ts";
import { createAccount, createDevice } from "../support/factories.ts";
import {
  getNewIdentifiers,
  provisionDevice,
} from "../../src/service/device.service.ts";
import prisma from "../../src/infra/prisma.ts";

Deno.test("provisionDevice: allocates after the highest serial, not the newest row", async () => {
  await startPgBoss();
  await resetDb();
  const account = await createAccount();
  // Backdated, as an import or seed would leave them: the highest serial is the
  // oldest row and the newest row is 00003.
  const createdAt: Record<string, string> = {
    "00004": "2025-01-01T00:00:00Z",
    "00001": "2026-01-01T00:00:00Z",
    "00002": "2026-01-01T00:00:00Z",
    "00003": "2026-02-01T00:00:00Z",
  };
  for (const [serialNumber, at] of Object.entries(createdAt)) {
    const device = await createDevice(account.id, {
      serialNumber,
      uniqueName: `imported-${serialNumber}`,
    });
    await prisma.device.update({
      where: { id: device.id },
      data: { createdAt: new Date(at) },
    });
  }

  const { status, device } = await provisionDevice({
    uid: "0123456789ABCDEF01234567",
    type: "rriv_0_4_2",
    accountId: account.id,
  });
  assertEquals(status, 201);
  assertEquals(device.serialNumber, "00005");
});

Deno.test("provisionDevice: skips a serial whose unique name is already taken", async () => {
  await startPgBoss();
  await resetDb();
  const account = await createAccount();
  await createDevice(account.id, {
    serialNumber: "00001",
    uniqueName: "first-device",
  });
  // Another device already holds the name 00002 would be given.
  await createDevice(account.id, {
    serialNumber: "00000",
    uniqueName: getNewIdentifiers("00001").uniqueName,
  });

  const { status, device } = await provisionDevice({
    uid: "0123456789ABCDEF01234568",
    type: "rriv_0_4_2",
    accountId: account.id,
  });
  assertEquals(status, 201);
  assertEquals(device.serialNumber, "00003");
});

Deno.test("provisionDevice: creates a device then is idempotent by uid", async () => {
  await startPgBoss();
  await resetDb();
  const account = await createAccount();
  const uid = "0123456789ABCDEF01234567";

  const first = await provisionDevice({
    uid,
    type: "rriv_0_4_2",
    accountId: account.id,
  });
  assertEquals(first.status, 201);

  const second = await provisionDevice({
    uid,
    type: "rriv_0_4_2",
    accountId: account.id,
  });
  assertEquals(second.status, 200);
  assertEquals(second.device.id, first.device.id);
});
