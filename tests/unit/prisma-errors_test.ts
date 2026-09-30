import { assert, assertEquals } from "@std/assert";
import { isUniqueConstraintError } from "../../src/utils/prisma-errors.ts";

Deno.test("isUniqueConstraintError: Prisma P2002", () => {
  assert(isUniqueConstraintError({ code: "P2002" }));
});

Deno.test("isUniqueConstraintError: raw Postgres 23505", () => {
  assert(isUniqueConstraintError({ code: "23505" }));
});

Deno.test("isUniqueConstraintError: other codes and values are false", () => {
  assertEquals(isUniqueConstraintError({ code: "P2025" }), false);
  assertEquals(isUniqueConstraintError({ code: 400 }), false);
  assertEquals(isUniqueConstraintError(new Error("boom")), false);
  assertEquals(isUniqueConstraintError(null), false);
  assertEquals(isUniqueConstraintError(undefined), false);
  assertEquals(isUniqueConstraintError("P2002"), false);
});
