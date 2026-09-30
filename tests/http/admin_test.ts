import { assertEquals } from "@std/assert";
import { resetDb } from "../support/db.ts";
import { startHarness } from "../support/harness.ts";
import { startPgBoss } from "../support/pgboss.ts";
import { apiFetch, listen } from "../support/http.ts";
import { createAccount } from "../support/factories.ts";

Deno.test("admin routes require the admin relation", async () => {
  await startPgBoss();
  const harness = await startHarness();
  const server = await listen();
  try {
    await resetDb();
    const admin = await createAccount({ email: "admin@test.local" });
    const other = await createAccount({ email: "other@test.local" });
    const otherAuth = {
      authorization: `Bearer ${await harness.tokenFor(other.id)}`,
    };

    // Non-admin is forbidden on every admin route.
    for (
      const path of ["/admin/admins", "/admin/auth-sync", "/admin/metrics"]
    ) {
      const response = await apiFetch(server.url, path, { headers: otherAuth });
      assertEquals(response.status, 403, `${path} should be 403`);
    }

    // Admin is allowed.
    harness.authApi.seed([
      { user: `user:${admin.id}`, relation: "admin", object: "system:rriv" },
    ]);
    const adminAuth = {
      authorization: `Bearer ${await harness.tokenFor(admin.id)}`,
    };
    for (
      const path of ["/admin/admins", "/admin/auth-sync", "/admin/metrics"]
    ) {
      const response = await apiFetch(server.url, path, { headers: adminAuth });
      assertEquals(response.status, 200, `${path} should be 200`);
    }

    // Grant + revoke through the API.
    const granted = await apiFetch(server.url, "/admin/admins", {
      method: "POST",
      headers: adminAuth,
      body: JSON.stringify({ email: "other@test.local" }),
    });
    assertEquals(granted.status, 201);

    const removed = await apiFetch(server.url, `/admin/admins/${other.id}`, {
      method: "DELETE",
      headers: adminAuth,
    });
    assertEquals(removed.status, 204);
  } finally {
    await server.close();
    await harness.stop();
  }
});
