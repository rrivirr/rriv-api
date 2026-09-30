-- Database backstops for two invariants that were previously enforced only by
-- app-level checks reading the (eventually consistent) OpenFGA index through
-- auth-api:
--
--   * one active (non-archived) context name per account
--   * one active (unbound) bind per device
--
-- Those checks lag the database, so during the authorization-sync window a
-- duplicate could be inserted. These partial unique indexes make the database
-- the authority; the API maps the resulting unique violation (P2002 / 23505)
-- to a 409.
--
-- NOTE: Prisma cannot express partial indexes, so neither index appears in
-- schema.prisma. Do not let `prisma migrate dev` / `db pull` drop them; they
-- are the real guard.

-- ---------------------------------------------------------------------------
-- 1. One active context name per account.
-- ---------------------------------------------------------------------------
-- Resolve any pre-existing duplicates first (later duplicates are renamed with
-- their id, never deleted) so the index can be created. The suffixed name is
-- longer than the API's 20-char input limit; that only affects rows that were
-- already duplicated and can be renamed again through the API.
WITH ranked AS (
    SELECT
        "id",
        row_number() OVER (
            PARTITION BY "account_id", "name"
            ORDER BY "started_at", "id"
        ) AS rn
    FROM "context"
    WHERE "archived_at" IS NULL
)
UPDATE "context" c
SET "name" = left(c."name", 7) || '~' || c."id"::text
FROM ranked r
WHERE c."id" = r."id" AND r.rn > 1;

CREATE UNIQUE INDEX "context_account_id_name_active_key"
    ON "context" ("account_id", "name")
    WHERE "archived_at" IS NULL;

-- ---------------------------------------------------------------------------
-- 2. One active bind per device.
-- ---------------------------------------------------------------------------
-- Close any pre-existing duplicate active binds first, keeping the earliest
-- (deterministic: bound_at, then id).
WITH ranked AS (
    SELECT
        "id",
        row_number() OVER (
            PARTITION BY "device_id"
            ORDER BY "bound_at", "id"
        ) AS rn
    FROM "bind"
    WHERE "unbound_at" IS NULL AND "archived_at" IS NULL
)
UPDATE "bind" b
SET "unbound_at" = now(), "archived_at" = now()
FROM ranked r
WHERE b."id" = r."id" AND r.rn > 1;

CREATE UNIQUE INDEX "bind_device_id_active_key"
    ON "bind" ("device_id")
    WHERE "unbound_at" IS NULL AND "archived_at" IS NULL;
