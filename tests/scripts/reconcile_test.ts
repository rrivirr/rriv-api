import { assertEquals } from "@std/assert";
import { prisma, resetDb } from "../support/db.ts";
import { queuedJobCount, startPgBoss } from "../support/pgboss.ts";
import {
  createAccount,
  createBind,
  createContext,
  createDevice,
} from "../support/factories.ts";
import { full, sweep } from "../../scripts/reconcile.ts";

Deno.test("reconcile full enqueues every context and account with a bind", async () => {
  await startPgBoss();
  await resetDb();
  const account = await createAccount();
  const context = await createContext(account.id);
  const device = await createDevice(account.id);
  await createBind(account.id, device.id);

  await full();

  assertEquals(await queuedJobCount(`context:${context.id}`), 1);
  assertEquals(await queuedJobCount(`account:${account.id}`), 1);
});

Deno.test("reconcile sweep re-queues stale non-synced resources", async () => {
  await startPgBoss();
  await resetDb();
  const account = await createAccount();
  const context = await createContext(account.id);
  const row = await prisma.authSync.create({
    data: { resourceType: "context", resourceId: context.id, status: "failed" },
  });
  // `updated_at` is @updatedAt, so age the row with raw SQL. Pass a JS Date
  // (serialized the same way Prisma serializes the sweep cutoff) rather than
  // `now()`, so the comparison is timezone-independent.
  await prisma.$executeRawUnsafe(
    `UPDATE rriv.auth_sync SET updated_at = $1 WHERE id = $2::uuid`,
    new Date(Date.now() - 60 * 60 * 1000),
    row.id,
  );

  await sweep();

  assertEquals(await queuedJobCount(`context:${context.id}`), 1);
  const updated = await prisma.authSync.findUniqueOrThrow({
    where: { id: row.id },
  });
  assertEquals(updated.status, "pending");
});
