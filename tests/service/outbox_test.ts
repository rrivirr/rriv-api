import { assert, assertEquals, assertRejects } from "@std/assert";
import { prisma, resetDb } from "../support/db.ts";
import { queuedJobCount, startPgBoss } from "../support/pgboss.ts";
import { createAccount, createContext } from "../support/factories.ts";
import { syncAuthorization } from "../../src/service/authorization-sync.service.ts";

Deno.test("syncAuthorization: intent and job are written atomically", async () => {
  await startPgBoss();
  await resetDb();
  const account = await createAccount();
  const context = await createContext(account.id);

  await assertRejects(() =>
    prisma.$transaction(async (trx) => {
      await syncAuthorization({ type: "context", id: context.id }, trx);
      throw new Error("rollback");
    })
  );

  assertEquals(
    await prisma.authSync.count({ where: { resourceId: context.id } }),
    0,
  );
  assertEquals(await queuedJobCount(`context:${context.id}`), 0);
});

Deno.test("syncAuthorization: writes the intent row and a deduped job", async () => {
  await startPgBoss();
  await resetDb();
  const account = await createAccount();
  const context = await createContext(account.id);

  await syncAuthorization({ type: "context", id: context.id });
  await syncAuthorization({ type: "context", id: context.id });

  const sync = await prisma.authSync.findFirst({
    where: { resourceType: "context", resourceId: context.id },
  });
  assert(sync);
  assertEquals(sync?.status, "pending");
  assertEquals(await queuedJobCount(`context:${context.id}`), 1);
});
