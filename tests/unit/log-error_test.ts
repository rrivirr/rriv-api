import { assert, assertEquals } from "@std/assert";
import { AxiosError } from "npm:axios";
import {
  redact,
  scrubString,
  serializeError,
} from "../../src/utils/log-error.ts";

Deno.test("scrubString redacts known secrets and common shapes", () => {
  // KEYCLOAK_CLIENT_SECRET from .env.test.
  assertEquals(
    scrubString("client test-manage-users-secret ok"),
    "client [redacted] ok",
  );
  assertEquals(scrubString("Bearer aaa.bbb.ccc"), "Bearer [redacted]");
  assertEquals(
    scrubString("http://user:secret@host:5432/db"),
    "http://user:[redacted]@host:5432/db",
  );
  assert(!scrubString("client_secret=topsecret&x=1").includes("topsecret"));
});

Deno.test("redact redacts sensitive keys recursively", () => {
  assertEquals(
    redact({
      client_secret: "x",
      nested: { password: "y", apiKey: "z", keep: "v" },
      token: "t",
      ok: "value",
    }),
    {
      client_secret: "[redacted]",
      nested: { password: "[redacted]", apiKey: "[redacted]", keep: "v" },
      token: "[redacted]",
      ok: "value",
    },
  );
});

Deno.test("serializeError captures Error details", () => {
  const serialized = serializeError(new Error("boom"));
  assertEquals(serialized.name, "Error");
  assertEquals(serialized.message, "boom");
  assert(typeof serialized.stack === "string");
});

Deno.test("serializeError captures AxiosError status/url without secrets", () => {
  const error = new AxiosError(
    "Request failed",
    "ERR_BAD_REQUEST",
    { method: "post", url: "/check" } as never,
    undefined,
    { status: 403, data: { token: "abc", ok: true } } as never,
  );
  const serialized = serializeError(error);
  assertEquals(serialized.status, 403);
  assertEquals(serialized.method, "POST");
  assertEquals(serialized.url, "/check");
  assertEquals(serialized.response, { token: "[redacted]", ok: true });
});
