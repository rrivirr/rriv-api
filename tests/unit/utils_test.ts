import { assert, assertEquals, assertNotEquals } from "@std/assert";
import { getSeed } from "../../src/service/utils/get-seed.ts";
import { isId } from "../../src/utils/helper-functions.ts";
import { getConfigChangesMade } from "../../src/service/utils/get-changes-made.ts";

Deno.test("getSeed is deterministic per serial and varies across serials", () => {
  assertEquals(getSeed("00001"), getSeed("00001"));
  assertNotEquals(getSeed("00001"), getSeed("00002"));
  assert(Number.isInteger(getSeed("00001")));
});

Deno.test("isId discriminates id from device identifier", () => {
  assert(isId({ id: "abc" }));
  assertEquals(isId({ deviceIdentifier: "abc" }), false);
});

Deno.test("getConfigChangesMade reports additions, removals and changes", () => {
  assertEquals(
    getConfigChangesMade({
      previousConfig: { a: 1, b: 2 },
      currentConfig: { a: 9, c: 3 },
    }),
    { b: "removed", a: "1 -> 9", c: "added and set to 3" },
  );
});
