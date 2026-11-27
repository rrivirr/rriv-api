import { assertEquals } from "@std/assert";
import { prisma, resetDb } from "../support/db.ts";
import { startHarness } from "../support/harness.ts";
import { apiFetch, listen } from "../support/http.ts";
import {
  createAccount,
  createOwnedDeviceContext,
} from "../support/factories.ts";

type Harness = Awaited<ReturnType<typeof startHarness>>;

const json = (body: unknown) => JSON.stringify(body);

const authFor = async (harness: Harness, accountId: string) => ({
  authorization: `Bearer ${await harness.tokenFor(accountId)}`,
});

const seedDrivers = async (accountId: string) => {
  const sensor = await prisma.sensorDriver.create({
    data: {
      name: "generic",
      validation: { type: "object" },
      creatorId: accountId,
    },
  });
  const datalogger = await prisma.dataloggerDriver.create({
    data: {
      name: "rriv",
      validation: { type: "object" },
      creatorId: accountId,
    },
  });
  return { sensorDriverId: sensor.id, dataloggerDriverId: datalogger.id };
};

Deno.test("library configs: owners edit name, description and visibility; official stays public", async () => {
  const harness = await startHarness();
  const server = await listen();
  try {
    await resetDb();
    const owner = await createAccount();
    const admin = await createAccount({ email: "admin@test.local" });
    const stranger = await createAccount();
    harness.authApi.seed([
      { user: `user:${admin.id}`, relation: "admin", object: "system:rriv" },
    ]);
    const drivers = await seedDrivers(owner.id);
    const ownerAuth = await authFor(harness, owner.id);
    const adminAuth = await authFor(harness, admin.id);
    const strangerAuth = await authFor(harness, stranger.id);

    const created = await apiFetch(server.url, "/sensor/libraryConfig", {
      method: "POST",
      headers: ownerAuth,
      body: json({
        name: "ph-probe",
        config: { type: "ph", pin: 3 },
        sensorName: "ph",
        sensorDriverId: drivers.sensorDriverId,
        firmwareVersion: "1.4.0",
      }),
    });
    assertEquals(created.status, 201);
    const { id } = await created.json();

    // Rename, describe, publish.
    const patched = await apiFetch(server.url, `/sensor/libraryConfig/${id}`, {
      method: "PATCH",
      headers: ownerAuth,
      body: json({
        name: "ph-standard",
        description: "field kit",
        isPublic: true,
      }),
    });
    assertEquals(patched.status, 200);
    const body = await patched.json();
    assertEquals([body.name, body.description, body.isPublic], [
      "ph-standard",
      "field kit",
      true,
    ]);

    // The detail says whose it is.
    const mine = await apiFetch(server.url, `/sensor/libraryConfig/${id}`, {
      headers: ownerAuth,
    });
    assertEquals((await mine.json()).isMine, true);
    const theirs = await apiFetch(server.url, `/sensor/libraryConfig/${id}`, {
      headers: strangerAuth,
    });
    assertEquals((await theirs.json()).isMine, false);

    // Nothing to update / someone else's config.
    assertEquals(
      (await apiFetch(server.url, `/sensor/libraryConfig/${id}`, {
        method: "PATCH",
        headers: ownerAuth,
        body: json({}),
      })).status,
      422,
    );
    assertEquals(
      (await apiFetch(server.url, `/sensor/libraryConfig/${id}`, {
        method: "PATCH",
        headers: strangerAuth,
        body: json({ name: "mine-now" }),
      })).status,
      404,
    );

    // Only admins mark configs official.
    const officialPath = `/admin/libraryConfig/sensor/${id}`;
    assertEquals(
      (await apiFetch(server.url, officialPath, {
        method: "PATCH",
        headers: ownerAuth,
        body: json({ isOfficial: true }),
      })).status,
      403,
    );
    const marked = await apiFetch(server.url, officialPath, {
      method: "PATCH",
      headers: adminAuth,
      body: json({ isOfficial: true }),
    });
    assertEquals(marked.status, 200);
    assertEquals((await marked.json()).isOfficial, true);

    // Listed under official; the owner can't make it private.
    const official = await apiFetch(
      server.url,
      "/sensor/libraryConfig?isPublic=true&isOfficial=true",
      { headers: strangerAuth },
    );
    assertEquals((await official.json()).map((c: { id: string }) => c.id), [
      id,
    ]);
    assertEquals(
      (await apiFetch(server.url, `/sensor/libraryConfig/${id}`, {
        method: "PATCH",
        headers: ownerAuth,
        body: json({ isPublic: false }),
      })).status,
      409,
    );

    // Unmarked: private is allowed again.
    await apiFetch(server.url, officialPath, {
      method: "PATCH",
      headers: adminAuth,
      body: json({ isOfficial: false }),
    });
    assertEquals(
      (await apiFetch(server.url, `/sensor/libraryConfig/${id}`, {
        method: "PATCH",
        headers: ownerAuth,
        body: json({ isPublic: false }),
      })).status,
      200,
    );

    // Marking a private config official makes it public.
    const dl = await apiFetch(server.url, "/datalogger/libraryConfig", {
      method: "POST",
      headers: ownerAuth,
      body: json({
        name: "dl-default",
        dataloggerDriverId: drivers.dataloggerDriverId,
        config: { interval: 15 },
      }),
    });
    const dlId = (await dl.json()).id;
    const dlMarked = await apiFetch(
      server.url,
      `/admin/libraryConfig/datalogger/${dlId}`,
      { method: "PATCH", headers: adminAuth, body: json({ isOfficial: true }) },
    );
    assertEquals((await dlMarked.json()).isPublic, true);

    // Unknown config.
    assertEquals(
      (await apiFetch(
        server.url,
        `/admin/libraryConfig/system/${crypto.randomUUID()}`,
        {
          method: "PATCH",
          headers: adminAuth,
          body: json({ isOfficial: true }),
        },
      )).status,
      404,
    );
  } finally {
    await server.close();
    await harness.stop();
  }
});

Deno.test("saved snapshots: rename and delete your own only", async () => {
  const harness = await startHarness();
  const server = await listen();
  try {
    await resetDb();
    const { account, device, context } = await createOwnedDeviceContext();
    harness.authApi.seed([{
      user: `user:${account.id}`,
      relation: "owner",
      object: `context:${context.id}`,
    }]);
    const { sensorDriverId } = await seedDrivers(account.id);
    const auth = await authFor(harness, account.id);
    const stranger = await createAccount();
    const strangerAuth = await authFor(harness, stranger.id);

    await apiFetch(server.url, "/sensor/config", {
      method: "POST",
      headers: auth,
      body: json({
        name: "ph",
        config: { type: "ph" },
        sensorDriverId,
        deviceId: device.id,
        contextId: context.id,
        singlePropertyChange: false,
        createdAt: new Date().toISOString(),
      }),
    });
    const save = (name: string) =>
      apiFetch(server.url, "/configSnapshot/save", {
        method: "POST",
        headers: auth,
        body: json({ name, deviceId: device.id, contextId: context.id }),
      });
    const first = await (await save("before-trip")).json();
    await save("after-trip");

    const rename = (id: string, name: string, headers = auth) =>
      apiFetch(server.url, `/configSnapshot/${id}`, {
        method: "PATCH",
        headers,
        body: json({ name }),
      });
    assertEquals((await rename(first.id, "after-trip")).status, 409);
    assertEquals(
      (await rename(first.id, "pre-season", strangerAuth)).status,
      404,
    );
    const renamed = await rename(first.id, "pre-season");
    assertEquals(renamed.status, 200);
    assertEquals((await renamed.json()).name, "pre-season");

    assertEquals(
      (await apiFetch(server.url, `/configSnapshot/${first.id}`, {
        method: "DELETE",
        headers: strangerAuth,
      })).status,
      404,
    );
    assertEquals(
      (await apiFetch(server.url, `/configSnapshot/${first.id}`, {
        method: "DELETE",
        headers: auth,
      })).status,
      204,
    );
    const listed = await (await apiFetch(server.url, "/configSnapshot", {
      headers: auth,
    })).json();
    assertEquals(listed.map((s: { name: string }) => s.name), ["after-trip"]);

    // The name is free again once deleted.
    assertEquals((await save("pre-season")).status, 201);
  } finally {
    await server.close();
    await harness.stop();
  }
});

Deno.test("version numbers come from the API: a client can't choose one", async () => {
  const harness = await startHarness();
  const server = await listen();
  try {
    await resetDb();
    const owner = await createAccount();
    const drivers = await seedDrivers(owner.id);
    const auth = await authFor(harness, owner.id);
    const post = (path: string, body: unknown) =>
      apiFetch(server.url, path, {
        method: "POST",
        headers: auth,
        body: json(body),
      });

    const kinds = [
      {
        base: "/sensor/libraryConfig",
        create: {
          name: "ph-probe",
          sensorName: "ph",
          sensorDriverId: drivers.sensorDriverId,
          config: { type: "ph", pin: 1 },
        },
        next: (n: number) => ({
          sensorName: "ph",
          sensorDriverId: drivers.sensorDriverId,
          config: { type: "ph", pin: n },
        }),
        versions: (id: string) =>
          prisma.sensorLibraryConfigVersion.findMany({
            where: { sensorLibraryConfigId: id },
            orderBy: { createdAt: "asc" },
          }),
      },
      {
        base: "/datalogger/libraryConfig",
        create: {
          name: "dl-base",
          dataloggerDriverId: drivers.dataloggerDriverId,
          config: { interval: 1 },
        },
        next: (n: number) => ({
          dataloggerDriverId: drivers.dataloggerDriverId,
          config: { interval: n },
        }),
        versions: (id: string) =>
          prisma.dataloggerLibraryConfigVersion.findMany({
            where: { dataloggerLibraryConfigId: id },
            orderBy: { createdAt: "asc" },
          }),
      },
      {
        base: "/configSnapshot/libraryConfig",
        create: {
          name: "station",
          dataloggerDriverId: drivers.dataloggerDriverId,
          datalogger: { interval: 1 },
          sensors: [],
        },
        next: (n: number) => ({
          dataloggerDriverId: drivers.dataloggerDriverId,
          datalogger: { interval: n },
          sensors: [],
        }),
        versions: (id: string) =>
          prisma.systemLibraryConfigVersion.findMany({
            where: { systemLibraryConfigId: id },
            orderBy: { createdAt: "asc" },
          }),
      },
    ];

    for (const kind of kinds) {
      // Creating with a version, or publishing one, is refused outright.
      assertEquals(
        (await post(kind.base, { ...kind.create, version: 7 })).status,
        422,
        `${kind.base}: version on create`,
      );
      const { id } = await (await post(kind.base, kind.create)).json();
      assertEquals(
        (await post(`${kind.base}/${id}/version`, {
          ...kind.next(2),
          version: 1,
        }))
          .status,
        422,
        `${kind.base}: version on publish`,
      );

      // Versions are numbered in order by the API.
      await post(`${kind.base}/${id}/version`, kind.next(2));
      await post(`${kind.base}/${id}/version`, kind.next(3));
      assertEquals(
        (await kind.versions(id)).map((v) => v.version),
        [1, 2, 3],
        kind.base,
      );
    }
  } finally {
    await server.close();
    await harness.stop();
  }
});

Deno.test("library configs must pass the driver schema, like device uploads", async () => {
  const harness = await startHarness();
  const server = await listen();
  try {
    await resetDb();
    const owner = await createAccount();
    // A permissive driver that sorts first: the chosen driver must be used.
    await prisma.sensorDriver.create({
      data: {
        name: "aaa-any",
        validation: { type: "object" },
        creatorId: owner.id,
      },
    });
    const typed = await prisma.sensorDriver.create({
      data: {
        name: "typed",
        validation: {
          type: "object",
          properties: {
            type: { type: "string" },
            wait_time: { type: "number" },
          },
          required: ["type"],
        },
        creatorId: owner.id,
      },
    });
    const rriv = await prisma.dataloggerDriver.create({
      data: {
        name: "rriv",
        validation: {
          type: "object",
          properties: { sleep_interval: { type: "number" } },
        },
        creatorId: owner.id,
      },
    });
    const drivers = { sensorDriverId: typed.id, dataloggerDriverId: rriv.id };
    const auth = await authFor(harness, owner.id);
    const post = (path: string, body: unknown) =>
      apiFetch(server.url, path, {
        method: "POST",
        headers: auth,
        body: json(body),
      });

    // Sensor without its required type, or with a wrongly typed setting.
    assertEquals(
      (await post("/sensor/libraryConfig", {
        name: "no-type",
        sensorName: "ph",
        sensorDriverId: drivers.sensorDriverId,
        config: { wait_time: 1 },
      })).status,
      422,
    );
    const ok = await post("/sensor/libraryConfig", {
      name: "ph-probe",
      sensorName: "ph",
      sensorDriverId: drivers.sensorDriverId,
      config: { type: "ph", wait_time: 1 },
    });
    assertEquals(ok.status, 201);
    const { id } = await ok.json();
    assertEquals(
      (await post(`/sensor/libraryConfig/${id}/version`, {
        sensorName: "ph",
        sensorDriverId: drivers.sensorDriverId,
        config: { type: "ph", wait_time: "soon" },
      })).status,
      422,
    );

    // Whole device: the datalogger and every sensor are checked.
    assertEquals(
      (await post("/configSnapshot/libraryConfig", {
        name: "station",
        dataloggerDriverId: drivers.dataloggerDriverId,
        datalogger: { sleep_interval: "often" },
        sensors: [],
      })).status,
      422,
    );
    assertEquals(
      (await post("/configSnapshot/libraryConfig", {
        name: "station",
        dataloggerDriverId: drivers.dataloggerDriverId,
        datalogger: { sleep_interval: 15 },
        sensors: [{
          name: "ph",
          sensorDriverId: drivers.sensorDriverId,
          wait_time: 1,
        }],
      })).status,
      422,
    );
    assertEquals(
      (await post("/configSnapshot/libraryConfig", {
        name: "station",
        dataloggerDriverId: drivers.dataloggerDriverId,
        datalogger: { sleep_interval: 15 },
        sensors: [{
          name: "ph",
          sensorDriverId: drivers.sensorDriverId,
          type: "ph",
        }],
      })).status,
      201,
    );

    // The driver is the client's choice: required, and must exist.
    assertEquals(
      (await post("/sensor/libraryConfig", {
        name: "no-driver",
        sensorName: "ph",
        config: { type: "ph" },
      })).status,
      422,
    );
    assertEquals(
      (await post("/sensor/libraryConfig", {
        name: "bad-driver",
        sensorName: "ph",
        sensorDriverId: crypto.randomUUID(),
        config: { type: "ph" },
      })).status,
      422,
    );
    // Stored with the chosen driver, not the first one.
    const stored = await prisma.sensorLibraryConfigVersion.findFirstOrThrow({
      where: { SensorLibraryConfig: { name: "ph-probe" } },
      select: { SensorConfig: { select: { sensorDriverId: true } } },
    });
    assertEquals(stored.SensorConfig.sensorDriverId, typed.id);
  } finally {
    await server.close();
    await harness.stop();
  }
});
