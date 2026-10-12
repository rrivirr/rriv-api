import prisma from "../infra/prisma.ts";
import { HttpException } from "../utils/http-exception.ts";
import { getAccountByEmail, getAccountsByIds } from "./account.service.ts";
import { read, SYSTEM, writeRelationshipsNow } from "./auth.service.ts";
import { createNotification } from "./notification.service.ts";

/**
 * Exclusive advisory-lock key guarding admin-set mutations. Revoking an admin
 * is a check-then-act (read the admin set, then delete); without serialization
 * two concurrent revocations could each see two admins and remove the other,
 * leaving zero.
 */
const ADMIN_LOCK_KEY = 7321001;

/** System roles granted as direct tuples on `system:rriv`. */
export const SYSTEM_ROLES = ["admin", "provisioner"] as const;
export type SystemRole = (typeof SYSTEM_ROLES)[number];

const GRANT_NOTIFICATIONS: Record<
  SystemRole,
  { type: string; title: string; body: string }
> = {
  admin: {
    type: "ADMIN_GRANTED",
    title: "You are now an admin",
    body: "You have been granted administrator access.",
  },
  provisioner: {
    type: "PROVISIONER_GRANTED",
    title: "You are now a provisioner",
    body: "You can now provision new RRIV boards.",
  },
};

/** Accounts holding `role` directly (admins are not listed as provisioners). */
const roleAccountIds = async (role: SystemRole): Promise<string[]> => {
  const tuples = await read({ object: SYSTEM, relation: role });
  return tuples
    .filter((tuple) => tuple.user.startsWith("user:"))
    .map((tuple) => tuple.user.slice("user:".length));
};

const byEmail = <T extends { email: string }>(a: T, b: T) =>
  a.email.localeCompare(b.email);

/** Every account with at least one system role, with the roles it holds. */
export const listRoleHolders = async () => {
  const idsByRole = await Promise.all(
    SYSTEM_ROLES.map(async (role) =>
      [role, await roleAccountIds(role)] as const
    ),
  );
  const rolesById = new Map<string, SystemRole[]>();
  for (const [role, ids] of idsByRole) {
    for (const id of ids) {
      rolesById.set(id, [...(rolesById.get(id) ?? []), role]);
    }
  }
  if (!rolesById.size) {
    return [];
  }
  const accounts = await getAccountsByIds([...rolesById.keys()]);
  return accounts
    .map((account) => ({ ...account, roles: rolesById.get(account.id) ?? [] }))
    .sort(byEmail);
};

export const grantRole = async (input: {
  email: string;
  role: SystemRole;
  grantedBy: string;
}) => {
  const account = await getAccountByEmail(input.email);

  const existing = await roleAccountIds(input.role);
  if (existing.includes(account.id)) {
    return { account, created: false };
  }

  await writeRelationshipsNow({
    writes: [{
      user: `user:${account.id}`,
      relation: input.role,
      object: SYSTEM,
    }],
    deletes: [],
  });

  await createNotification({
    accountId: account.id,
    ...GRANT_NOTIFICATIONS[input.role],
  });

  return { account, created: true };
};

/**
 * Revokes a system role. Idempotent. For `admin`, refuses to remove the last
 * admin, serialized with an advisory lock so concurrent revocations cannot
 * empty the admin set.
 */
export const revokeRole = async (input: {
  accountId: string;
  role: SystemRole;
}) => {
  const tuple = {
    user: `user:${input.accountId}`,
    relation: input.role,
    object: SYSTEM,
  };

  if (input.role !== "admin") {
    const existing = await roleAccountIds(input.role);
    if (existing.includes(input.accountId)) {
      await writeRelationshipsNow({ writes: [], deletes: [tuple] });
    }
    return;
  }

  await prisma.$transaction(async (trx) => {
    await trx
      .$executeRaw`SELECT pg_advisory_xact_lock(${ADMIN_LOCK_KEY}::bigint)`;

    const existing = await roleAccountIds("admin");
    if (!existing.includes(input.accountId)) {
      return;
    }
    if (existing.length <= 1) {
      throw new HttpException(409, "cannot remove the last admin");
    }

    await writeRelationshipsNow({ writes: [], deletes: [tuple] });
  });
};
