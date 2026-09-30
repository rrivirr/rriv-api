-- One active device context per device.
WITH ranked AS (
    SELECT
        "id",
        row_number() OVER (
            PARTITION BY "device_id"
            ORDER BY "started_at", "id"
        ) AS rn
    FROM "device_context"
    WHERE "ended_at" IS NULL AND "archived_at" IS NULL
)
UPDATE "device_context" dc
SET "ended_at" = now(), "archived_at" = now()
FROM ranked r
WHERE dc."id" = r."id" AND r.rn > 1;

CREATE UNIQUE INDEX "device_context_device_id_active_key"
    ON "device_context" ("device_id")
    WHERE "ended_at" IS NULL AND "archived_at" IS NULL;

-- One active assigned-device-name per context.
WITH ranked AS (
    SELECT
        "id",
        row_number() OVER (
            PARTITION BY "context_id", "assigned_device_name"
            ORDER BY "started_at", "id"
        ) AS rn
    FROM "device_context"
    WHERE "ended_at" IS NULL AND "archived_at" IS NULL
)
UPDATE "device_context" dc
SET "ended_at" = now(), "archived_at" = now()
FROM ranked r
WHERE dc."id" = r."id" AND r.rn > 1;

CREATE UNIQUE INDEX "device_context_context_id_assigned_name_active_key"
    ON "device_context" ("context_id", "assigned_device_name")
    WHERE "ended_at" IS NULL AND "archived_at" IS NULL;

-- ---------------------------------------------------------------------------
-- 3. One active EUI globally (a DevEUI identifies a single device).
-- ---------------------------------------------------------------------------
WITH ranked AS (
    SELECT
        "id",
        row_number() OVER (
            PARTITION BY "eui"
            ORDER BY "created_at" DESC, "id"
        ) AS rn
    FROM "device_eui"
    WHERE "active"
)
UPDATE "device_eui" de
SET "active" = false
FROM ranked r
WHERE de."id" = r."id" AND r.rn > 1;

CREATE UNIQUE INDEX "device_eui_eui_active_key"
    ON "device_eui" ("eui")
    WHERE "active";

-- ---------------------------------------------------------------------------
-- 4. One active config snapshot per device context.
-- ---------------------------------------------------------------------------
WITH ranked AS (
    SELECT
        "id",
        row_number() OVER (
            PARTITION BY "device_context_id"
            ORDER BY "created_at", "id"
        ) AS rn
    FROM "config_snapshot"
    WHERE "active" AND "archived_at" IS NULL AND "device_context_id" IS NOT NULL
)
UPDATE "config_snapshot" cs
SET "active" = false, "archived_at" = now()
FROM ranked r
WHERE cs."id" = r."id" AND r.rn > 1;

CREATE UNIQUE INDEX "config_snapshot_device_context_id_active_key"
    ON "config_snapshot" ("device_context_id")
    WHERE "active" AND "archived_at" IS NULL;

-- ---------------------------------------------------------------------------
-- 5. Sensor driver name (global namespace, matching the app check).
-- ---------------------------------------------------------------------------
WITH ranked AS (
    SELECT
        "id",
        row_number() OVER (
            PARTITION BY "name"
            ORDER BY "created_at", "id"
        ) AS rn
    FROM "sensor_driver"
    WHERE "archived_at" IS NULL
)
UPDATE "sensor_driver" sd
SET "name" = left(sd."name", 7) || '~' || sd."id"::text
FROM ranked r
WHERE sd."id" = r."id" AND r.rn > 1;

CREATE UNIQUE INDEX "sensor_driver_name_key"
    ON "sensor_driver" ("name")
    WHERE "archived_at" IS NULL;

-- ---------------------------------------------------------------------------
-- 6. Datalogger driver name (global namespace).
-- ---------------------------------------------------------------------------
WITH ranked AS (
    SELECT
        "id",
        row_number() OVER (
            PARTITION BY "name"
            ORDER BY "created_at", "id"
        ) AS rn
    FROM "datalogger_driver"
    WHERE "archived_at" IS NULL
)
UPDATE "datalogger_driver" dd
SET "name" = left(dd."name", 7) || '~' || dd."id"::text
FROM ranked r
WHERE dd."id" = r."id" AND r.rn > 1;

CREATE UNIQUE INDEX "datalogger_driver_name_key"
    ON "datalogger_driver" ("name")
    WHERE "archived_at" IS NULL;

-- ---------------------------------------------------------------------------
-- 7. Sensor library config name, per creator.
-- ---------------------------------------------------------------------------
WITH ranked AS (
    SELECT
        "id",
        row_number() OVER (
            PARTITION BY "creator_id", "name"
            ORDER BY "created_at", "id"
        ) AS rn
    FROM "sensor_library_config"
    WHERE "archived_at" IS NULL
)
UPDATE "sensor_library_config" lc
SET "name" = left(lc."name", 7) || '~' || lc."id"::text
FROM ranked r
WHERE lc."id" = r."id" AND r.rn > 1;

CREATE UNIQUE INDEX "sensor_library_config_creator_id_name_key"
    ON "sensor_library_config" ("creator_id", "name")
    WHERE "archived_at" IS NULL;

-- ---------------------------------------------------------------------------
-- 8. Datalogger library config name, per creator.
-- ---------------------------------------------------------------------------
WITH ranked AS (
    SELECT
        "id",
        row_number() OVER (
            PARTITION BY "creator_id", "name"
            ORDER BY "created_at", "id"
        ) AS rn
    FROM "datalogger_library_config"
    WHERE "archived_at" IS NULL
)
UPDATE "datalogger_library_config" lc
SET "name" = left(lc."name", 7) || '~' || lc."id"::text
FROM ranked r
WHERE lc."id" = r."id" AND r.rn > 1;

CREATE UNIQUE INDEX "datalogger_library_config_creator_id_name_key"
    ON "datalogger_library_config" ("creator_id", "name")
    WHERE "archived_at" IS NULL;

-- ---------------------------------------------------------------------------
-- 9. Config-snapshot (system) library config name, per creator.
-- ---------------------------------------------------------------------------
WITH ranked AS (
    SELECT
        "id",
        row_number() OVER (
            PARTITION BY "creator_id", "name"
            ORDER BY "created_at", "id"
        ) AS rn
    FROM "system_library_config"
    WHERE "archived_at" IS NULL
)
UPDATE "system_library_config" lc
SET "name" = left(lc."name", 7) || '~' || lc."id"::text
FROM ranked r
WHERE lc."id" = r."id" AND r.rn > 1;

CREATE UNIQUE INDEX "system_library_config_creator_id_name_key"
    ON "system_library_config" ("creator_id", "name")
    WHERE "archived_at" IS NULL;

-- ---------------------------------------------------------------------------
-- 10. One active sensor config per (config snapshot, name).
-- ---------------------------------------------------------------------------
WITH ranked AS (
    SELECT
        "id",
        row_number() OVER (
            PARTITION BY "config_snapshot_id", "name"
            ORDER BY "created_at" DESC, "id"
        ) AS rn
    FROM "sensor_config"
    WHERE "active" AND "archived_at" IS NULL
)
UPDATE "sensor_config" sc
SET "active" = false, "deactivated_at" = now()
FROM ranked r
WHERE sc."id" = r."id" AND r.rn > 1;

CREATE UNIQUE INDEX "sensor_config_config_snapshot_id_name_active_key"
    ON "sensor_config" ("config_snapshot_id", "name")
    WHERE "active" AND "archived_at" IS NULL;

-- ---------------------------------------------------------------------------
-- 11. One active datalogger config per config snapshot.
-- ---------------------------------------------------------------------------
WITH ranked AS (
    SELECT
        "id",
        row_number() OVER (
            PARTITION BY "config_snapshot_id"
            ORDER BY "created_at" DESC, "id"
        ) AS rn
    FROM "datalogger_config"
    WHERE "active" AND "archived_at" IS NULL
)
UPDATE "datalogger_config" dc
SET "active" = false, "deactivated_at" = now()
FROM ranked r
WHERE dc."id" = r."id" AND r.rn > 1;

CREATE UNIQUE INDEX "datalogger_config_config_snapshot_id_active_key"
    ON "datalogger_config" ("config_snapshot_id")
    WHERE "active" AND "archived_at" IS NULL;

-- ---------------------------------------------------------------------------
-- 12. Library config version numbers.
-- Duplicates are renumbered above the current max per library (order preserved
-- by created_at) so the unique indexes can be created without deleting history.
-- ---------------------------------------------------------------------------
WITH ranked AS (
    SELECT
        "id",
        "sensor_library_config_id",
        row_number() OVER (
            PARTITION BY "sensor_library_config_id", "version"
            ORDER BY "created_at", "id"
        ) AS dup_rn
    FROM "sensor_library_config_version"
),
to_move AS (
    SELECT
        "id",
        "sensor_library_config_id",
        row_number() OVER (
            PARTITION BY "sensor_library_config_id"
            ORDER BY "dup_rn", "id"
        ) AS move_seq
    FROM ranked
    WHERE dup_rn > 1
),
maxv AS (
    SELECT "sensor_library_config_id", max("version") AS mx
    FROM "sensor_library_config_version"
    GROUP BY "sensor_library_config_id"
)
UPDATE "sensor_library_config_version" v
SET "version" = (m.mx + t.move_seq)::int
FROM to_move t
JOIN maxv m ON m."sensor_library_config_id" = t."sensor_library_config_id"
WHERE v."id" = t."id";

CREATE UNIQUE INDEX "sensor_library_config_version_config_id_version_key"
    ON "sensor_library_config_version" ("sensor_library_config_id", "version");

-- ---------------------------------------------------------------------------
-- 13. Datalogger library config version numbers.
-- ---------------------------------------------------------------------------
WITH ranked AS (
    SELECT
        "id",
        "datalogger_library_config_id",
        row_number() OVER (
            PARTITION BY "datalogger_library_config_id", "version"
            ORDER BY "created_at", "id"
        ) AS dup_rn
    FROM "datalogger_library_config_version"
),
to_move AS (
    SELECT
        "id",
        "datalogger_library_config_id",
        row_number() OVER (
            PARTITION BY "datalogger_library_config_id"
            ORDER BY "dup_rn", "id"
        ) AS move_seq
    FROM ranked
    WHERE dup_rn > 1
),
maxv AS (
    SELECT "datalogger_library_config_id", max("version") AS mx
    FROM "datalogger_library_config_version"
    GROUP BY "datalogger_library_config_id"
)
UPDATE "datalogger_library_config_version" v
SET "version" = (m.mx + t.move_seq)::int
FROM to_move t
JOIN maxv m ON m."datalogger_library_config_id" = t."datalogger_library_config_id"
WHERE v."id" = t."id";

CREATE UNIQUE INDEX "datalogger_library_config_version_config_id_version_key"
    ON "datalogger_library_config_version" ("datalogger_library_config_id", "version");

-- ---------------------------------------------------------------------------
-- 14. Config-snapshot (system) library config version numbers.
-- ---------------------------------------------------------------------------
WITH ranked AS (
    SELECT
        "id",
        "system_library_config_id",
        row_number() OVER (
            PARTITION BY "system_library_config_id", "version"
            ORDER BY "created_at", "id"
        ) AS dup_rn
    FROM "system_library_config_version"
),
to_move AS (
    SELECT
        "id",
        "system_library_config_id",
        row_number() OVER (
            PARTITION BY "system_library_config_id"
            ORDER BY "dup_rn", "id"
        ) AS move_seq
    FROM ranked
    WHERE dup_rn > 1
),
maxv AS (
    SELECT "system_library_config_id", max("version") AS mx
    FROM "system_library_config_version"
    GROUP BY "system_library_config_id"
)
UPDATE "system_library_config_version" v
SET "version" = (m.mx + t.move_seq)::int
FROM to_move t
JOIN maxv m ON m."system_library_config_id" = t."system_library_config_id"
WHERE v."id" = t."id";

CREATE UNIQUE INDEX "system_library_config_version_config_id_version_key"
    ON "system_library_config_version" ("system_library_config_id", "version");
