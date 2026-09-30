import { assert, assertEquals, assertRejects } from "@std/assert";
import { startHarness } from "../support/harness.ts";
import { read, readResource } from "../../src/service/auth.service.ts";

Deno.test("auth-api contract: rriv-api authenticates its reads", async () => {
  const harness = await startHarness();
  try {
    const serviceToken = await harness.tokenFor(
      crypto.randomUUID(),
      "auth-api",
    );

    // The worker/reconciler must pass the service token explicitly.
    const tuples = await readResource(
      { type: "context", id: crypto.randomUUID() },
      serviceToken,
    );
    assertEquals(tuples, []);

    // Without a token auth-api rejects the call (the regression this guards).
    await assertRejects(() =>
      readResource({ type: "context", id: crypto.randomUUID() })
    );
  } finally {
    await harness.stop();
  }
});

Deno.test(
  "auth-api contract: readResource returns object- and user-side tuples",
  async () => {
    const harness = await startHarness();
    try {
      const serviceToken = await harness.tokenFor(
        crypto.randomUUID(),
        "auth-api",
      );
      const contextId = crypto.randomUUID();
      const deviceId = crypto.randomUUID();
      const ownerId = crypto.randomUUID();

      harness.authApi.seed([
        {
          user: `user:${ownerId}`,
          relation: "owner",
          object: `context:${contextId}`,
        },
        {
          user: `context:${contextId}`,
          relation: "context",
          object: `device:${deviceId}`,
        },
      ]);

      const tuples = await readResource(
        { type: "context", id: contextId },
        serviceToken,
      );

      assertEquals(tuples.length, 2);
      assert(tuples.some((t) => t.object === `device:${deviceId}`));
      assert(tuples.some((t) => t.user === `user:${ownerId}`));
    } finally {
      await harness.stop();
    }
  },
);

Deno.test(
  "auth-api contract: an account read is scoped to device tuples",
  async () => {
    const harness = await startHarness();
    try {
      const serviceToken = await harness.tokenFor(
        crypto.randomUUID(),
        "auth-api",
      );
      const accountId = crypto.randomUUID();
      const deviceId = crypto.randomUUID();
      const contextId = crypto.randomUUID();

      harness.authApi.seed([
        {
          user: `user:${accountId}`,
          relation: "owner",
          object: `device:${deviceId}`,
        },
        // Owned by the context sync — the account sync must not read (or delete) it.
        {
          user: `user:${accountId}`,
          relation: "owner",
          object: `context:${contextId}`,
        },
      ]);

      const tuples = await readResource(
        { type: "account", id: accountId },
        serviceToken,
      );

      assertEquals(tuples, [
        {
          user: `user:${accountId}`,
          relation: "owner",
          object: `device:${deviceId}`,
        },
      ]);
    } finally {
      await harness.stop();
    }
  },
);

Deno.test(
  "auth-api contract: a read without an object type is rejected",
  async () => {
    const harness = await startHarness();
    try {
      await assertRejects(() =>
        harness.asUser(
          crypto.randomUUID(),
          () => read({ user: "user:someone" }),
        )
      );
    } finally {
      await harness.stop();
    }
  },
);
