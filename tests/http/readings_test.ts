import { assert, assertEquals } from "@std/assert";
import { prisma, resetDb } from "../support/db.ts";
import { startHarness } from "../support/harness.ts";
import { startPgBoss } from "../support/pgboss.ts";
import { apiFetch, listen } from "../support/http.ts";
import {
  createAccount,
  createContext,
  createDevice,
} from "../support/factories.ts";
import { startFakeDataApi } from "../support/fake-data-api.ts";

const day = (n: number) => new Date(Date.UTC(2026, 0, n));
const iso = (n: number) => day(n).toISOString();
/** A window clipped by an inclusive rangeEnd ends 1 ms later (exclusive). */
const isoAfter = (n: number) => new Date(day(n).getTime() + 1).toISOString();

/** Decode a JWT payload (the fake signs real tokens). */
const claimsOf = (authorization: string | undefined) =>
  JSON.parse(
    atob(
      authorization!.replace("Bearer ", "").split(".")[1]
        .replace(/-/g, "+").replace(/_/g, "/"),
    ),
  );

Deno.test("GET /device/:id/readings scopes readings to the caller's windows", async () => {
  await startPgBoss();
  const harness = await startHarness();
  const dataApi = await startFakeDataApi();
  const server = await listen();
  try {
    await resetDb();
    dataApi.reset();
    const alice = await createAccount(); // past owner (days 2-6)
    const bob = await createAccount(); // current owner (from day 6)
    const carol = await createAccount(); // member of bob's context
    const mallory = await createAccount(); // no relation
    const admin = await createAccount();
    const device = await createDevice(alice.id);

    await prisma.deviceEui.createMany({
      data: [
        {
          eui: "E1",
          deviceId: device.id,
          creatorId: alice.id,
          active: false,
          createdAt: day(1),
          deactivatedAt: day(10),
        },
        {
          eui: "E2",
          deviceId: device.id,
          creatorId: bob.id,
          active: true,
          createdAt: day(10),
        },
      ],
    });
    await prisma.bind.createMany({
      data: [
        {
          accountId: alice.id,
          deviceId: device.id,
          boundAt: day(2),
          unboundAt: day(6),
        },
        { accountId: bob.id, deviceId: device.id, boundAt: day(6) },
      ],
    });
    const context = await createContext(bob.id);
    await prisma.deviceContext.create({
      data: {
        deviceId: device.id,
        contextId: context.id,
        assignedDeviceName: "well",
        startedAt: day(8),
      },
    });
    harness.authApi.seed([
      {
        user: `user:${carol.id}`,
        relation: "editor",
        object: `context:${context.id}`,
      },
      { user: `user:${admin.id}`, relation: "admin", object: "system:rriv" },
    ]);
    dataApi.setReadings([{ temperature: 21.5, timestamp: iso(9) }]);

    const get = async (
      accountId: string,
      query = `rangeStart=${iso(1)}&rangeEnd=${iso(20)}`,
    ) =>
      await apiFetch(server.url, `/device/${device.id}/readings?${query}`, {
        headers: {
          authorization: `Bearer ${await harness.tokenFor(accountId)}`,
        },
      });
    const lastWindows = () =>
      dataApi.requests.at(-1)!.body.windows.map((w) =>
        `${w.eui}:${w.start}-${w.end}`
      );

    // Past owner: only their own period.
    const asAlice = await get(alice.id);
    assertEquals(asAlice.status, 200);
    assertEquals(await asAlice.json(), [{
      temperature: 21.5,
      timestamp: iso(9),
    }]);
    assertEquals(lastWindows(), [`E1:${iso(2)}-${iso(6)}`]);

    // rriv-api calls data-api as the unprivileged data-api client.
    const claims = claimsOf(dataApi.requests.at(-1)!.authorization);
    assertEquals(claims.azp, "data-api");
    assertEquals(claims.preferred_username, "service-account-data-api");

    // Current owner, across the EUI change, clipped to the requested range.
    await (await get(bob.id)).body?.cancel();
    assertEquals(lastWindows(), [
      `E1:${iso(6)}-${iso(10)}`,
      `E2:${iso(10)}-${isoAfter(20)}`,
    ]);

    // Context member: from when the device joined the context (day 8).
    await (await get(carol.id)).body?.cancel();
    assertEquals(lastWindows(), [
      `E1:${iso(8)}-${iso(10)}`,
      `E2:${iso(10)}-${isoAfter(20)}`,
    ]);

    // Admin: every EUI period.
    await (await get(admin.id)).body?.cancel();
    assertEquals(lastWindows(), [
      `E1:${iso(1)}-${iso(10)}`,
      `E2:${iso(10)}-${isoAfter(20)}`,
    ]);

    // A stranger can't tell the device exists; data-api isn't asked.
    const calls = dataApi.requests.length;
    const asMallory = await get(mallory.id);
    assertEquals(asMallory.status, 404);
    await asMallory.body?.cancel();
    assertEquals(dataApi.requests.length, calls);

    // Outside every window: empty, without asking data-api.
    const early = await get(
      alice.id,
      `rangeStart=${iso(7)}&rangeEnd=${iso(8)}`,
    );
    assertEquals(await early.json(), []);
    assertEquals(dataApi.requests.length, calls);

    // CSV passes through as an attachment.
    const csv = await get(
      bob.id,
      `rangeStart=${iso(1)}&rangeEnd=${iso(20)}&format=csv`,
    );
    assertEquals(csv.status, 200);
    assert(csv.headers.get("content-type")?.startsWith("text/csv"));
    assert(csv.headers.get("content-disposition")?.includes("attachment"));
    assertEquals(
      await csv.text(),
      "temperature,timestamp\n21.5,2026-01-05T00:00:00.000Z\n",
    );

    // Bad query → 422.
    const bad = await get(bob.id, `rangeStart=${iso(5)}&rangeEnd=${iso(1)}`);
    assertEquals(bad.status, 422);
    await bad.body?.cancel();
  } finally {
    await server.close();
    await harness.stop();
  }
});

Deno.test("GET /device/:id/readings: an owner with no EUI yet gets an empty list", async () => {
  await startPgBoss();
  const harness = await startHarness();
  const dataApi = await startFakeDataApi();
  const server = await listen();
  try {
    await resetDb();
    dataApi.reset();
    const owner = await createAccount();
    const device = await createDevice(owner.id);
    await prisma.bind.create({
      data: { accountId: owner.id, deviceId: device.id },
    });
    harness.authApi.seed([
      {
        user: `user:${owner.id}`,
        relation: "owner",
        object: `device:${device.id}`,
      },
    ]);

    const response = await apiFetch(
      server.url,
      `/device/${device.id}/readings`,
      {
        headers: {
          authorization: `Bearer ${await harness.tokenFor(owner.id)}`,
        },
      },
    );
    assertEquals(response.status, 200);
    assertEquals(await response.json(), []);
    assertEquals(dataApi.requests.length, 0);
  } finally {
    await server.close();
    await harness.stop();
  }
});

Deno.test("GET /device/:id/readings: an auth-api failure is an error, not a 404", async () => {
  await startPgBoss();
  const harness = await startHarness();
  const dataApi = await startFakeDataApi();
  const server = await listen();
  try {
    await resetDb();
    dataApi.reset();
    const owner = await createAccount();
    const device = await createDevice(owner.id);
    await prisma.bind.create({
      data: { accountId: owner.id, deviceId: device.id },
    });
    harness.authApi.seed([
      {
        user: `user:${owner.id}`,
        relation: "owner",
        object: `device:${device.id}`,
      },
    ]);
    // isAdmin and the context listing succeed; the can_write check fails.
    harness.authApi.failNext([0, 0, 503]);

    const response = await apiFetch(
      server.url,
      `/device/${device.id}/readings`,
      {
        headers: {
          authorization: `Bearer ${await harness.tokenFor(owner.id)}`,
        },
      },
    );
    assertEquals(response.status, 500);
    await response.body?.cancel();
    assertEquals(dataApi.requests.length, 0);
  } finally {
    await server.close();
    await harness.stop();
  }
});
