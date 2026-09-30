-- One active EUI per device.

WITH ranked AS (
    SELECT
        "id",
        row_number() OVER (
            PARTITION BY "device_id"
            ORDER BY "created_at" DESC, "id"
        ) AS rn
    FROM "device_eui"
    WHERE "active"
)
UPDATE "device_eui" de
SET "active" = false
FROM ranked r
WHERE de."id" = r."id" AND r.rn > 1;

CREATE UNIQUE INDEX "device_eui_device_id_active_key"
    ON "device_eui" ("device_id")
    WHERE "active";
