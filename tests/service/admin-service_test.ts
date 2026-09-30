import { assert, assertEquals } from "@std/assert";
import { prisma, resetDb } from "../support/db.ts";
import { startHarness } from "../support/harness.ts";
import { createAccount } from "../support/factories.ts";
import { assertRejectsWithCode } from "../support/assert.ts";
import * as adminService from "../../src/service/admin.service.ts";

Deno.test("grantAdmin/listAdmins/revokeAdmin with the last-admin guard", async () => {
  const harness = await startHarness();
  try {
    await resetDb();
    const admin = await createAccount({ email: "admin@test.local" });
    const other = await createAccount({ email: "other@test.local" });

    // Bootstrap grant.
    await harness.asUser(admin.id, () =>
      adminService.grantAdmin({
        email: "admin@test.local",
        grantedBy: admin.id,
      }));

    let admins = await harness.asUser(
      admin.id,
      () => adminService.listAdmins(),
    );
    assertEquals(admins.map((a) => a.email), ["admin@test.local"]);

    // Granting is idempotent.
    const again = await harness.asUser(admin.id, () =>
      adminService.grantAdmin({
        email: "admin@test.local",
        grantedBy: admin.id,
      }));
    assertEquals(again.created, false);

    // Grant a second admin, then revoke them.
    await harness.asUser(admin.id, () =>
      adminService.grantAdmin({
        email: "other@test.local",
        grantedBy: admin.id,
      }));
    admins = await harness.asUser(admin.id, () => adminService.listAdmins());
    assertEquals(admins.length, 2);

    await harness.asUser(
      admin.id,
      () => adminService.revokeAdmin({ accountId: other.id }),
    );
    admins = await harness.asUser(admin.id, () => adminService.listAdmins());
    assertEquals(admins.map((a) => a.email), ["admin@test.local"]);

    // The last admin cannot be removed.
    await assertRejectsWithCode(
      () =>
        harness.asUser(
          admin.id,
          () => adminService.revokeAdmin({ accountId: admin.id }),
        ),
      409,
    );
    assertEquals(
      harness.authApi.has(`user:${admin.id}`, "admin", "system:rriv"),
      true,
    );

    // The target is notified on grant.
    assert(
      await prisma.notification.count({ where: { accountId: other.id } }) >= 1,
    );
  } finally {
    await harness.stop();
  }
});
