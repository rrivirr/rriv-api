import { assert, assertEquals } from "@std/assert";
import { prisma, resetDb } from "../support/db.ts";
import { startHarness } from "../support/harness.ts";
import {
  createAccount,
  createContext,
  createDevice,
  createDeviceContext,
} from "../support/factories.ts";
import { applyAuthorizationSync } from "../../src/service/authorization-sync.service.ts";

Deno.test("applyAuthorizationSync converges a context and removes drift", async () => {
  const harness = await startHarness();
  try {
    await resetDb();
    const account = await createAccount();
    const context = await createContext(account.id);
    const device = await createDevice(account.id);
    await createDeviceContext(device.id, context.id, "well-a");
    await prisma.authSync.create({
      data: { resourceType: "context", resourceId: context.id },
    });

    const staleEditor = crypto.randomUUID();
    harness.authApi.seed([
      {
        user: `user:${staleEditor}`,
        relation: "editor",
        object: `context:${context.id}`,
      },
    ]);

    const result = await applyAuthorizationSync({
      type: "context",
      id: context.id,
    });

    assert(
      harness.authApi.has("system:rriv", "system", `context:${context.id}`),
    );
    assert(
      harness.authApi.has(
        `user:${account.id}`,
        "owner",
        `context:${context.id}`,
      ),
    );
    assert(
      harness.authApi.has(
        `context:${context.id}`,
        "context",
        `device:${device.id}`,
      ),
    );
    assertEquals(
      harness.authApi.tuples().filter((t) => t.user === `user:${staleEditor}`)
        .length,
      0,
    );
    assert(result.writes > 0);
    assertEquals(result.deletes, 1);

    const sync = await prisma.authSync.findFirst({
      where: { resourceType: "context", resourceId: context.id },
    });
    assertEquals(sync?.status, "synced");
    assertEquals(sync?.lastError, null);
  } finally {
    await harness.stop();
  }
});
