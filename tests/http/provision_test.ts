import { assertEquals } from "@std/assert";
import { resetDb } from "../support/db.ts";
import { startHarness } from "../support/harness.ts";
import { startPgBoss } from "../support/pgboss.ts";
import { apiFetch, listen } from "../support/http.ts";
import { createAccount } from "../support/factories.ts";

const UID = "0123456789ABCDEF01234567";

Deno.test("POST /device is limited to provisioners and admins", async () => {
  await startPgBoss();
  const harness = await startHarness();
  const server = await listen();
  try {
    await resetDb();
    const plain = await createAccount({ email: "plain@test.local" });
    const provisioner = await createAccount({ email: "prov@test.local" });
    const admin = await createAccount({ email: "admin@test.local" });
    harness.authApi.seed([
      {
        user: `user:${provisioner.id}`,
        relation: "provisioner",
        object: "system:rriv",
      },
      { user: `user:${admin.id}`, relation: "admin", object: "system:rriv" },
    ]);
    const provision = async (accountId: string) =>
      await apiFetch(server.url, "/device", {
        method: "POST",
        headers: {
          authorization: `Bearer ${await harness.tokenFor(accountId)}`,
        },
        body: JSON.stringify({ uid: UID, type: "rriv_0_4_2" }),
      });

    // A regular account can't create devices, nor read one back by uid.
    const denied = await provision(plain.id);
    assertEquals(denied.status, 403);
    await denied.body?.cancel();

    const created = await provision(provisioner.id);
    assertEquals(created.status, 201);
    const device = await created.json();

    // Admins are implied provisioners; re-provisioning is idempotent by uid.
    const again = await provision(admin.id);
    assertEquals(again.status, 200);
    assertEquals((await again.json()).id, device.id);

    // Still denied for the regular account once the device exists.
    const stillDenied = await provision(plain.id);
    assertEquals(stillDenied.status, 403);
    await stillDenied.body?.cancel();
  } finally {
    await server.close();
    await harness.stop();
  }
});
