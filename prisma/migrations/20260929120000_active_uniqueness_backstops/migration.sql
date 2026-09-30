-- One active context name per account.
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

-- One active bind per device.
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
