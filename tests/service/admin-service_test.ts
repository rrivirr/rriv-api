import { assert, assertEquals } from "@std/assert";
import { prisma, resetDb } from "../support/db.ts";
import { startHarness } from "../support/harness.ts";
import { createAccount } from "../support/factories.ts";
import { assertRejectsWithCode } from "../support/assert.ts";
import * as adminService from "../../src/service/admin.service.ts";

Deno.test("admin role: grant, list, revoke with the last-admin guard", async () => {
  const harness = await startHarness();
  try {
    await resetDb();
    const admin = await createAccount({ email: "admin@test.local" });
    const other = await createAccount({ email: "other@test.local" });
    const grantAdmin = (email: string) =>
      harness.asUser(
        admin.id,
        () =>
          adminService.grantRole({ email, role: "admin", grantedBy: admin.id }),
      );
    const revokeAdmin = (accountId: string) =>
      harness.asUser(
        admin.id,
        () => adminService.revokeRole({ accountId, role: "admin" }),
      );
    const adminEmails = async () =>
      (await harness.asUser(admin.id, () => adminService.listRoleHolders()))
        .filter((holder) => holder.roles.includes("admin"))
        .map((holder) => holder.email);

    // Bootstrap grant.
    await grantAdmin("admin@test.local");
    assertEquals(await adminEmails(), ["admin@test.local"]);

    // Granting is idempotent.
    assertEquals((await grantAdmin("admin@test.local")).created, false);

    // Grant a second admin, then revoke them.
    await grantAdmin("other@test.local");
    assertEquals((await adminEmails()).length, 2);
    await revokeAdmin(other.id);
    assertEquals(await adminEmails(), ["admin@test.local"]);

    // The last admin cannot be removed.
    await assertRejectsWithCode(() => revokeAdmin(admin.id), 409);
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

Deno.test("grantRole notifies provisioners and revokeRole is idempotent", async () => {
  const harness = await startHarness();
  try {
    await resetDb();
    const admin = await createAccount({ email: "admin@test.local" });
    const other = await createAccount({ email: "other@test.local" });
    harness.authApi.seed([
      { user: `user:${admin.id}`, relation: "admin", object: "system:rriv" },
    ]);

    const first = await harness.asUser(admin.id, () =>
      adminService.grantRole({
        email: "other@test.local",
        role: "provisioner",
        grantedBy: admin.id,
      }));
    assertEquals(first.created, true);
    const again = await harness.asUser(admin.id, () =>
      adminService.grantRole({
        email: "other@test.local",
        role: "provisioner",
        grantedBy: admin.id,
      }));
    assertEquals(again.created, false);

    assertEquals(
      await prisma.notification.count({
        where: { accountId: other.id, type: "PROVISIONER_GRANTED" },
      }),
      1,
    );

    // Admins hold provisioner through the model, not as a listed grant.
    const holders = await harness.asUser(
      admin.id,
      () => adminService.listRoleHolders(),
    );
    assertEquals(holders.map((h) => [h.email, h.roles]), [
      ["admin@test.local", ["admin"]],
      ["other@test.local", ["provisioner"]],
    ]);

    await harness.asUser(
      admin.id,
      () =>
        adminService.revokeRole({ accountId: other.id, role: "provisioner" }),
    );
    await harness.asUser(
      admin.id,
      () =>
        adminService.revokeRole({ accountId: other.id, role: "provisioner" }),
    );
    assertEquals(
      harness.authApi.has(`user:${other.id}`, "provisioner", "system:rriv"),
      false,
    );
  } finally {
    await harness.stop();
  }
});
