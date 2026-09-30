-- One active EUI per device.
--
-- The earlier 20260929160000 migration added a global unique index on
-- device_eui(eui) WHERE active (one device per EUI). This adds the
-- complementary invariant the service already assumes — a device has at most
-- one active EUI — which is what `sendCommand` relies on when it reads
-- DeviceEuis[0].

-- Close any pre-existing duplicate active EUIs per device, keeping the newest.
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
