import { assert, assertEquals } from "@std/assert";
import { prisma, resetDb } from "../support/db.ts";
import {
  createAccount,
  createBind,
  createContext,
  createDevice,
  createDeviceContext,
} from "../support/factories.ts";
import { desiredTuples } from "../../src/service/authorization-sync.service.ts";

const tupleKey = (t: { user: string; relation: string; object: string }) =>
  `${t.user}|${t.relation}|${t.object}`;

Deno.test("desiredTuples(context): system, owner, share and device link", async () => {
  await resetDb();
  const owner = await createAccount();
  const editor = await createAccount();
  const context = await createContext(owner.id);
  const device = await createDevice(owner.id);
  await createDeviceContext(device.id, context.id, "well-a");
  await prisma.contextShare.create({
    data: {
      contextId: context.id,
      accountId: editor.id,
      relation: "editor",
      createdBy: owner.id,
    },
  });

  const keys = new Set(
    (await desiredTuples({ type: "context", id: context.id })).map(tupleKey),
  );
  assert(keys.has(`system:rriv|system|context:${context.id}`));
  assert(keys.has(`user:${owner.id}|owner|context:${context.id}`));
  assert(keys.has(`user:${editor.id}|editor|context:${context.id}`));
  assert(keys.has(`context:${context.id}|context|device:${device.id}`));
});

Deno.test("desiredTuples(context): ended or archived grants nothing", async () => {
  await resetDb();
  const owner = await createAccount();
  const context = await createContext(owner.id);
  await prisma.context.update({
    where: { id: context.id },
    data: { endedAt: new Date(), archivedAt: new Date() },
  });
  assertEquals(await desiredTuples({ type: "context", id: context.id }), []);
});

Deno.test("desiredTuples(account): system on provisioned devices, owner on binds", async () => {
  await resetDb();
  const account = await createAccount();
  const device = await createDevice(account.id);
  await createBind(account.id, device.id);

  const keys = new Set(
    (await desiredTuples({ type: "account", id: account.id })).map(tupleKey),
  );
  assert(keys.has(`system:rriv|system|device:${device.id}`));
  assert(keys.has(`user:${account.id}|owner|device:${device.id}`));
});
