import { assertEquals } from "@std/assert";
import { prisma, resetDb } from "../support/db.ts";
import { startHarness } from "../support/harness.ts";
import { apiFetch, listen } from "../support/http.ts";
import { createAccount } from "../support/factories.ts";

Deno.test("account email actions and notifications", async () => {
  const harness = await startHarness();
  const server = await listen();
  try {
    await resetDb();
    const account = await createAccount({ email: "ada@test.local" });
    const auth = {
      authorization: `Bearer ${await harness.tokenFor(account.id)}`,
    };
    const json = { "content-type": "application/json" };

    // Email actions are idempotent and return 204.
    for (const path of ["/account/verifyEmail", "/account/resetPassword"]) {
      const response = await apiFetch(server.url, path, {
        method: "POST",
        headers: json,
        body: JSON.stringify({ email: "ada@test.local" }),
      });
      assertEquals(response.status, 204, `${path} should be 204`);
    }

    await prisma.notification.create({
      data: { accountId: account.id, type: "TEST", title: "hello" },
    });

    const list = await apiFetch(server.url, "/notification", {
      headers: auth,
    });
    assertEquals(list.status, 200);
    const body = await list.json();
    assertEquals(body.items.length, 1);
    assertEquals(body.unread, 1);

    // Mark one read, then all read.
    const marked = await apiFetch(
      server.url,
      `/notification/${body.items[0].id}/read`,
      { method: "POST", headers: auth },
    );
    assertEquals(marked.status, 200);
    const afterOne = await (await apiFetch(server.url, "/notification", {
      headers: auth,
    })).json();
    assertEquals(afterOne.unread, 0);

    await prisma.notification.create({
      data: { accountId: account.id, type: "TEST", title: "second" },
    });
    const readAll = await apiFetch(server.url, "/notification/read-all", {
      method: "POST",
      headers: auth,
    });
    assertEquals(readAll.status, 200);
    const afterAll = await (await apiFetch(server.url, "/notification", {
      headers: auth,
    })).json();
    assertEquals(afterAll.unread, 0);
    assertEquals(afterAll.items.length, 2);
  } finally {
    await server.close();
    await harness.stop();
  }
});
