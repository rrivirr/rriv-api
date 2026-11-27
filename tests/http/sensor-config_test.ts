import { assert, assertEquals } from "@std/assert";
import { prisma, resetDb } from "../support/db.ts";
import { startHarness } from "../support/harness.ts";
import { apiFetch, listen } from "../support/http.ts";
import { createOwnedDeviceContext } from "../support/factories.ts";

Deno.test("POST /sensor/config: 201 on a change, 200 and no row when identical; /deactivate ends it", async () => {
  const harness = await startHarness();
  const server = await listen();
  try {
    await resetDb();
    const { account, device, context, deviceContext } =
      await createOwnedDeviceContext();
    harness.authApi.seed([{
      user: `user:${account.id}`,
      relation: "owner",
      object: `context:${context.id}`,
    }]);
    const driver = await prisma.sensorDriver.create({
      data: {
        name: "generic",
        validation: { type: "object" },
        creatorId: account.id,
      },
    });
    const auth = {
      authorization: `Bearer ${await harness.tokenFor(account.id)}`,
    };
    const upload = () =>
      apiFetch(server.url, "/sensor/config", {
        method: "POST",
        headers: auth,
        body: JSON.stringify({
          name: "ph",
          config: { type: "ph", pin: 3 },
          sensorDriverId: driver.id,
          deviceId: device.id,
          contextId: context.id,
          singlePropertyChange: false,
          createdAt: new Date().toISOString(),
        }),
      });

    const created = await upload();
    assertEquals(created.status, 201);
    const row = await created.json();

    const same = await upload();
    assertEquals(same.status, 200);
    const body = await same.json();
    assertEquals(body.id, row.id);
    assert(!("unchanged" in body));

    const removed = await apiFetch(server.url, "/sensor/config/deactivate", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        name: "ph",
        deviceId: device.id,
        contextId: context.id,
      }),
    });
    assertEquals(removed.status, 200);
    assertEquals((await removed.json()).active, false);

    // Save the device's config as a snapshot: the response names it.
    await upload();
    const saved = await apiFetch(server.url, "/configSnapshot/save", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        name: "before-trip",
        deviceId: device.id,
        contextId: context.id,
      }),
    });
    assertEquals(saved.status, 201);
    const savedBody = await saved.json();
    assertEquals(savedBody.name, "before-trip");
    const listed = await apiFetch(
      server.url,
      `/configSnapshot?id=${savedBody.id}`,
      { headers: auth },
    );
    assertEquals((await listed.json())[0].id, savedBody.id);

    const rows = await prisma.sensorConfig.findMany({
      where: { ConfigSnapshot: { deviceContextId: deviceContext.id } },
      orderBy: { createdAt: "asc" },
    });
    // The ended row, then the re-added one (the saved copy isn't the device's).
    assertEquals(rows.map((r) => r.active), [false, true]);
  } finally {
    await server.close();
    await harness.stop();
  }
});
