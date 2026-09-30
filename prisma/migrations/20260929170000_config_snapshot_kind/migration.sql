-- Discriminate config_snapshot rows (device_active / saved / library) so that
-- saved-snapshot names can be made unique per creator without colliding with
-- the per-device "active" snapshots (all named "active") or the per-library
-- "vN" snapshots (all named "v1", "v2", ...), which share the same table and
-- the same (creator_id, name) space.
--
-- This is a stored discriminator: the kind cannot be derived in a partial index
-- predicate (the library link is a foreign key from
-- system_library_config_version, and partial predicates cannot use subqueries).

ALTER TABLE "config_snapshot" ADD COLUMN "kind" TEXT;

-- Classify by structure, not by `active`: a device-active snapshot always has
-- a device_context_id, even after the check-then-act repair deactivated a
-- duplicate. Library snapshots are the ones referenced by a library version;
-- everything else is a user-saved snapshot.
UPDATE "config_snapshot" cs
SET "kind" = CASE
    WHEN cs."device_context_id" IS NOT NULL THEN 'device_active'
    WHEN EXISTS (
        SELECT 1
        FROM "system_library_config_version" v
        WHERE v."config_snapshot_id" = cs."id"
    ) THEN 'library'
    ELSE 'saved'
END;

ALTER TABLE "config_snapshot" ALTER COLUMN "kind" SET NOT NULL;

ALTER TABLE "config_snapshot"
    ADD CONSTRAINT "config_snapshot_kind_check"
    CHECK ("kind" IN ('device_active', 'saved', 'library'));

-- Rename duplicate saved snapshot names (later ones) so the index can be
-- created. Nothing is deleted.
WITH ranked AS (
    SELECT
        "id",
        row_number() OVER (
            PARTITION BY "creator_id", "name"
            ORDER BY "created_at", "id"
        ) AS rn
    FROM "config_snapshot"
    WHERE "kind" = 'saved' AND "archived_at" IS NULL
)
UPDATE "config_snapshot" cs
SET "name" = left(cs."name", 7) || '~' || cs."id"::text
FROM ranked r
WHERE cs."id" = r."id" AND r.rn > 1;

CREATE UNIQUE INDEX "config_snapshot_saved_creator_id_name_key"
    ON "config_snapshot" ("creator_id", "name")
    WHERE "kind" = 'saved' AND "archived_at" IS NULL;
