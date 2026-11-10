import { assert, assertEquals, assertRejects } from "@std/assert";
import { AUTH_SERVICE_URL } from "../support/env.ts";
import { startHarness } from "../support/harness.ts";
import { read, readResource } from "../../src/service/auth.service.ts";

Deno.test(
  "auth-api contract: rriv-api calls auth-api with its service token",
  async () => {
    const harness = await startHarness();
    try {
      // No request context: the worker/reconciler path works on its own.
      assertEquals(
        await readResource({ type: "context", id: crypto.randomUUID() }),
        [],
      );
      assertEquals(
        await read({ object: "system:rriv", relation: "admin" }),
        [],
      );

      // One Keycloak request serves every call until the token nears expiry.
      assertEquals(harness.keycloak.tokenRequests.get("auth-api"), 1);
    } finally {
      await harness.stop();
    }
  },
);

Deno.test("auth-api contract: end-user tokens are rejected", async () => {
  const harness = await startHarness();
  try {
    for (const azp of ["rriv-web", "rrivctl"]) {
      const token = await harness.tokenFor(crypto.randomUUID(), azp);
      const res = await fetch(`${AUTH_SERVICE_URL}/check`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          user: "user:x",
          relation: "admin",
          object: "system:rriv",
        }),
      });
      assertEquals(res.status, 401, azp);
      await res.body?.cancel();
    }
  } finally {
    await harness.stop();
  }
});

Deno.test(
  "auth-api contract: readResource returns object- and user-side tuples",
  async () => {
    const harness = await startHarness();
    try {
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
