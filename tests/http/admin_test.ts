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

Deno.test("role routes grant, list and revoke provisioners", async () => {
  await startPgBoss();
  const harness = await startHarness();
  const server = await listen();
  try {
    await resetDb();
    const admin = await createAccount({ email: "admin@test.local" });
    const other = await createAccount({ email: "other@test.local" });
    harness.authApi.seed([
      { user: `user:${admin.id}`, relation: "admin", object: "system:rriv" },
    ]);
    const adminAuth = {
      authorization: `Bearer ${await harness.tokenFor(admin.id)}`,
    };
    const otherAuth = {
      authorization: `Bearer ${await harness.tokenFor(other.id)}`,
    };

    const forbidden = await apiFetch(server.url, "/admin/roles", {
      headers: otherAuth,
    });
    assertEquals(forbidden.status, 403);
    await forbidden.body?.cancel();

    const badRole = await apiFetch(server.url, "/admin/roles", {
      method: "POST",
      headers: adminAuth,
      body: JSON.stringify({ email: "other@test.local", role: "owner" }),
    });
    assertEquals(badRole.status, 422);
    await badRole.body?.cancel();

    const granted = await apiFetch(server.url, "/admin/roles", {
      method: "POST",
      headers: adminAuth,
      body: JSON.stringify({ email: "other@test.local", role: "provisioner" }),
    });
    assertEquals(granted.status, 201);
    await granted.body?.cancel();
    assertEquals(
      harness.authApi.has(`user:${other.id}`, "provisioner", "system:rriv"),
      true,
    );

    const listed = await apiFetch(server.url, "/admin/roles", {
      headers: adminAuth,
    });
    assertEquals(
      (await listed.json()).map((
        account: { email: string; roles: string[] },
      ) => [account.email, account.roles]),
      [["admin@test.local", ["admin"]], ["other@test.local", ["provisioner"]]],
    );

    const revoked = await apiFetch(
      server.url,
      `/admin/roles/provisioner/${other.id}`,
      { method: "DELETE", headers: adminAuth },
    );
    assertEquals(revoked.status, 204);
    await revoked.body?.cancel();
    assertEquals(
      harness.authApi.has(`user:${other.id}`, "provisioner", "system:rriv"),
      false,
    );

    // The last-admin guard still applies through the roles route.
    const lastAdmin = await apiFetch(
      server.url,
      `/admin/roles/admin/${admin.id}`,
      { method: "DELETE", headers: adminAuth },
    );
    assertEquals(lastAdmin.status, 409);
    await lastAdmin.body?.cancel();
  } finally {
    await server.close();
    await harness.stop();
  }
});
