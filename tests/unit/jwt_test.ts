import { assertEquals, assertObjectMatch, assertRejects } from "@std/assert";
import { startHarness } from "../support/harness.ts";
import { verifyJwtToken } from "../../src/infra/jwt.ts";
import { HttpException } from "../../src/utils/http-exception.ts";

const rejectsWith = async (promise: Promise<unknown>, code: number) => {
  const error = await assertRejects(() => promise, HttpException);
  assertEquals(error.code, code);
};

/**
 * A separate instance of the module, so its key cache starts empty (the
 * shared `verifyJwtToken` may already hold keys from other tests).
 */
let fresh = 0;
const coldVerifyJwtToken = async (): Promise<typeof verifyJwtToken> =>
  (await import(`../../src/infra/jwt.ts?cold=${++fresh}`)).verifyJwtToken;

Deno.test("verifyJwtToken: valid, expired, wrong issuer, malformed", async () => {
  const harness = await startHarness();
  try {
    const token = await harness.keycloak.issueToken({
      sub: "u1",
      azp: "rriv-web",
    });
    assertObjectMatch(await verifyJwtToken(token), {
      sub: "u1",
      azp: "rriv-web",
    });

    await rejectsWith(
      verifyJwtToken(
        await harness.keycloak.issueToken({ sub: "u1" }, { expiresIn: -60 }),
      ),
      401,
    );
    await rejectsWith(
      verifyJwtToken(
        await harness.keycloak.issueToken({ sub: "u1" }, {
          issuer: "https://evil.example/realms/test",
        }),
      ),
      401,
    );
    await rejectsWith(verifyJwtToken("not-a-jwt"), 401);
  } finally {
    await harness.stop();
  }
});

Deno.test("verifyJwtToken: cached keys survive an outage; cold start is 503", async () => {
  const harness = await startHarness();
  try {
    const token = await harness.keycloak.issueToken({ sub: "u1" });
    await verifyJwtToken(token);
    const cold = await coldVerifyJwtToken();

    harness.keycloak.setJwksUnavailable(true);
    try {
      assertObjectMatch(await verifyJwtToken(token), { sub: "u1" });
      await rejectsWith(cold(token), 503);
    } finally {
      harness.keycloak.setJwksUnavailable(false);
    }
  } finally {
    await harness.stop();
  }
});
