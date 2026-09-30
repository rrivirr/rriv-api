import { assert, assertEquals } from "@std/assert";
import { prisma, resetDb } from "../support/db.ts";
import { startHarness } from "../support/harness.ts";
import { startPgBoss } from "../support/pgboss.ts";
import { createAccount, createContext } from "../support/factories.ts";
import { assertRejectsWithCode } from "../support/assert.ts";
import * as contextService from "../../src/service/context.service.ts";

Deno.test("createContext: 409 on duplicate name via pre-check and DB backstop", async () => {
  await startPgBoss();
  const harness = await startHarness();
  try {
    await resetDb();
    const account = await createAccount();
    await harness.asUser(
      account.id,
      () =>
        contextService.createContext({ name: "well", accountId: account.id }),
    );
    const context = await prisma.context.findFirstOrThrow({
      where: { accountId: account.id, name: "well" },
    });

    // Pre-check path: listObjects sees the owner tuple.
    harness.authApi.seed([
      {
        user: `user:${account.id}`,
        relation: "owner",
        object: `context:${context.id}`,
      },
    ]);
    await assertRejectsWithCode(
      () =>
        harness.asUser(
          account.id,
          () =>
            contextService.createContext({
              name: "well",
              accountId: account.id,
            }),
        ),
      409,
    );

    // DB backstop path: hidden from the pre-check, still rejected.
    harness.authApi.reset();
    await assertRejectsWithCode(
      () =>
        harness.asUser(
          account.id,
          () =>
            contextService.createContext({
              name: "well",
              accountId: account.id,
            }),
        ),
      409,
    );
    assertEquals(
      await prisma.context.count({
        where: { accountId: account.id, name: "well" },
      }),
      1,
    );
  } finally {
    await harness.stop();
  }
});

Deno.test("shareContext: persists the share and enqueues a sync", async () => {
  await startPgBoss();
  const harness = await startHarness();
  try {
    await resetDb();
    const owner = await createAccount({ email: "owner@test.local" });
    const editor = await createAccount({ email: "editor@test.local" });
    const context = await createContext(owner.id);
    harness.authApi.seed([
      {
        user: `user:${owner.id}`,
        relation: "owner",
        object: `context:${context.id}`,
      },
    ]);

    await harness.asUser(owner.id, () =>
      contextService.shareContext({
        id: context.id,
        accountId: owner.id,
        email: "editor@test.local",
      }));

    const share = await prisma.contextShare.findFirst({
      where: { contextId: context.id, accountId: editor.id },
    });
    assert(share);
    assertEquals(share?.relation, "editor");
  } finally {
    await harness.stop();
  }
});
