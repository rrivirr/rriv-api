import { assertEquals } from "@std/assert";
import { resetDb } from "../support/db.ts";
import { startPgBoss } from "../support/pgboss.ts";
import { createAccount } from "../support/factories.ts";
import { provisionDevice } from "../../src/service/device.service.ts";

Deno.test("provisionDevice: creates a device then is idempotent by uid", async () => {
  await startPgBoss();
  await resetDb();
  const account = await createAccount();
  const uid = "0123456789ABCDEF01234567";

  const first = await provisionDevice({
    uid,
    type: "rriv_0_4_2",
    accountId: account.id,
  });
  assertEquals(first.status, 201);

  const second = await provisionDevice({
    uid,
    type: "rriv_0_4_2",
    accountId: account.id,
  });
  assertEquals(second.status, 200);
  assertEquals(second.device.id, first.device.id);
});
