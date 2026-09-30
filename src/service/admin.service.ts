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

const adminAccountIds = async (): Promise<string[]> => {
  const tuples = await read({ object: SYSTEM, relation: "admin" });
  return tuples
    .filter((tuple) => tuple.user.startsWith("user:"))
    .map((tuple) => tuple.user.slice("user:".length));
};

export const listAdmins = async () => {
  const ids = await adminAccountIds();
  if (!ids.length) {
    return [];
  }
  const accounts = await getAccountsByIds(ids);
  return accounts.sort((a, b) => a.email.localeCompare(b.email));
};

export const grantAdmin = async (input: {
  email: string;
  grantedBy: string;
}) => {
  const account = await getAccountByEmail(input.email);

  const existing = await adminAccountIds();
  if (existing.includes(account.id)) {
    return { account, created: false };
  }

  await writeRelationshipsNow({
    writes: [{ user: `user:${account.id}`, relation: "admin", object: SYSTEM }],
    deletes: [],
  });

  await createNotification({
    accountId: account.id,
    type: "ADMIN_GRANTED",
    title: "You are now an admin",
    body: "You have been granted administrator access.",
  });

  return { account, created: true };
};

/**
 * Revokes `admin` from an account. Idempotent; refuses to remove the last
 * admin. Serialized with an advisory lock so concurrent revocations cannot
 * empty the admin set.
 */
export const revokeAdmin = async (input: { accountId: string }) => {
  await prisma.$transaction(async (trx) => {
    await trx
      .$executeRaw`SELECT pg_advisory_xact_lock(${ADMIN_LOCK_KEY}::bigint)`;

    const existing = await adminAccountIds();
    if (!existing.includes(input.accountId)) {
      return;
    }
    if (existing.length <= 1) {
      throw new HttpException(409, "cannot remove the last admin");
    }

    await writeRelationshipsNow({
      writes: [],
      deletes: [
        { user: `user:${input.accountId}`, relation: "admin", object: SYSTEM },
      ],
    });
  });
};
