import { assert, assertEquals } from "@std/assert";
import { prisma, resetDb } from "../support/db.ts";
import { startHarness } from "../support/harness.ts";
import { startPgBoss } from "../support/pgboss.ts";
import { apiFetch, listen } from "../support/http.ts";
import { createAccount } from "../support/factories.ts";

Deno.test("POST /context creates + enqueues; GET /context lists owned contexts", async () => {
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

    const row = await prisma.context.findFirstOrThrow({
      where: { accountId: account.id, name: "well" },
    });
    assertEquals(
      await prisma.authSync.count({
        where: { resourceType: "context", resourceId: row.id },
      }),
      1,
    );

    // Not visible until the owner tuple exists.
    const before = await apiFetch(server.url, "/context", { headers: auth });
    assertEquals((await before.json()).length, 0);

    harness.authApi.seed([
      {
        user: `user:${account.id}`,
        relation: "owner",
        object: `context:${row.id}`,
      },
    ]);
    const after = await apiFetch(server.url, "/context", { headers: auth });
    const list = await after.json();
    assertEquals(list.length, 1);
    assertEquals(list[0].name, "well");
    assert(list[0].id === row.id);
  } finally {
    await server.close();
    await harness.stop();
  }
});
