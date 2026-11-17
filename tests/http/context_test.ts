import { assert, assertEquals } from "@std/assert";
import { prisma, resetDb } from "../support/db.ts";
import { startHarness } from "../support/harness.ts";
import { startPgBoss } from "../support/pgboss.ts";
import { apiFetch, listen } from "../support/http.ts";
import { createAccount } from "../support/factories.ts";

Deno.test("POST /context returns the context, which is readable straight away", async () => {
  await startPgBoss();
  const harness = await startHarness();
  const server = await listen();
  try {
    await resetDb();
    const account = await createAccount();
    const auth = {
      authorization: `Bearer ${await harness.tokenFor(account.id)}`,
    };

    const created = await apiFetch(server.url, "/context", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ name: "well" }),
    });
    assertEquals(created.status, 201);
    const body = await created.json();

    const row = await prisma.context.findFirstOrThrow({
      where: { accountId: account.id, name: "well" },
    });
    assertEquals(body.id, row.id);
    assertEquals(body.name, "well");

    // The sync job is still queued as the backstop, and already marked synced.
    const sync = await prisma.authSync.findUniqueOrThrow({
      where: {
        resourceType_resourceId: {
          resourceType: "context",
          resourceId: row.id,
        },
      },
    });
    assertEquals(sync.status, "synced");

    // Create-then-use: listed and found by name without waiting for the queue.
    const list = await (await apiFetch(server.url, "/context", {
      headers: auth,
    })).json();
    assertEquals(list.length, 1);
    assert(list[0].id === row.id);

    const byName = await (await apiFetch(server.url, "/context?name=well", {
      headers: auth,
    })).json();
    assertEquals(byName.length, 1);
    assertEquals(byName[0].id, row.id);
  } finally {
    await server.close();
    await harness.stop();
  }
});

Deno.test("POST /context still succeeds when the inline sync fails; the queue converges it", async () => {
  await startPgBoss();
  const harness = await startHarness();
  const server = await listen();
  try {
    await resetDb();
    const account = await createAccount();
    const auth = {
      authorization: `Bearer ${await harness.tokenFor(account.id)}`,
    };

    // Let the duplicate-name pre-check through, then fail the inline sync.
    harness.authApi.failNext([0, 503]);
    const created = await apiFetch(server.url, "/context", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ name: "well" }),
    });
    assertEquals(created.status, 201);
    const body = await created.json();

    const sync = await prisma.authSync.findUniqueOrThrow({
      where: {
        resourceType_resourceId: {
          resourceType: "context",
          resourceId: body.id,
        },
      },
    });
    assertEquals(sync.status, "pending");
  } finally {
    await server.close();
    await harness.stop();
  }
});
