import { assert, assertEquals } from "@std/assert";
import { AxiosError } from "npm:axios";
import { isPermanentAuthError } from "../../src/service/authorization-sync.service.ts";

const axiosError = (status?: number) =>
  new AxiosError(
    "boom",
    "ERR",
    undefined,
    undefined,
    status === undefined ? undefined : ({ status } as never),
  );

Deno.test("isPermanentAuthError: 4xx (except 408/429) is permanent", () => {
  assert(isPermanentAuthError(axiosError(400)));
  assert(isPermanentAuthError(axiosError(401)));
  assert(isPermanentAuthError(axiosError(403)));
  assert(isPermanentAuthError(axiosError(422)));
});

Deno.test("isPermanentAuthError: 408/429/5xx are transient", () => {
  assertEquals(isPermanentAuthError(axiosError(408)), false);
  assertEquals(isPermanentAuthError(axiosError(429)), false);
  assertEquals(isPermanentAuthError(axiosError(500)), false);
  assertEquals(isPermanentAuthError(axiosError(503)), false);
});

Deno.test("isPermanentAuthError: connection errors are transient", () => {
  assertEquals(isPermanentAuthError(axiosError(undefined)), false);
  assertEquals(isPermanentAuthError(new Error("ECONNREFUSED")), false);
  assertEquals(isPermanentAuthError("nope"), false);
});
