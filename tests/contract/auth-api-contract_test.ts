import { assertEquals, assertRejects } from "@std/assert";
import { startHarness } from "../support/harness.ts";
import { readResource } from "../../src/service/auth.service.ts";

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
