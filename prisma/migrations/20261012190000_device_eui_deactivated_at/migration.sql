ALTER TABLE "device_eui" ADD COLUMN "deactivated_at" TIMESTAMP(6);

-- Backfill: EUIs are only deactivated by registerEui, in the same transaction
-- that creates the device's next EUI, so an inactive EUI ended when the next
-- one was created.
WITH ordered AS (
    SELECT
        "id",
        lead("created_at") OVER (
            PARTITION BY "device_id"
            ORDER BY "created_at", "id"
        ) AS next_created_at
    FROM "device_eui"
)
UPDATE "device_eui" de
SET "deactivated_at" = o.next_created_at
FROM ordered o
WHERE de."id" = o."id" AND NOT de."active" AND o.next_created_at IS NOT NULL;
