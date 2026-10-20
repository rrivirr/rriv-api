import { assertEquals } from "@std/assert";
import { prisma, resetDb } from "../support/db.ts";
import { startHarness } from "../support/harness.ts";
import { installFakeChirpstack } from "../support/chirpstack.ts";
import { createOwnedDeviceContext } from "../support/factories.ts";
import { registerEui } from "../../src/service/device.service.ts";

Deno.test("registerEui: registers via ChirpStack and replaces the active EUI", async () => {
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

    const status = await harness.asUser(account.id, () =>
      registerEui({
        deviceId: device.id,
        accountId: account.id,
        eui: "0102030405060701",
        joinEui: "0102030405060702",
        application: "rriv",
      }));
    assertEquals(status, 201);

    await harness.asUser(account.id, () =>
      registerEui({
        deviceId: device.id,
        accountId: account.id,
        eui: "0102030405060703",
        joinEui: "0102030405060702",
        application: "rriv",
      }));

    const active = await prisma.deviceEui.findMany({
      where: { deviceId: device.id, active: true },
      select: { eui: true },
    });
    assertEquals(active.map((row) => row.eui), ["0102030405060703"]);
    assertEquals(chirpstack.created.length, 2);

    // The replaced EUI's period ends exactly where the new one's begins.
    const [previous, current] = await prisma.deviceEui.findMany({
      where: { deviceId: device.id },
      orderBy: { createdAt: "asc" },
    });
    assertEquals(previous.active, false);
    assertEquals(current.deactivatedAt, null);
    assertEquals(
      previous.deactivatedAt?.getTime(),
      current.createdAt.getTime(),
    );
  } finally {
    chirpstack.restore();
    await harness.stop();
  }
});
