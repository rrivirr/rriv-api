-- Which library version a device config row came from. A row has at most one
-- source: its own kind's library (sensor or datalogger) or a whole-device
-- (system) library version. NULL means set by hand or before this existed.
ALTER TABLE "sensor_config"
    ADD COLUMN "source_sensor_library_config_version_id" UUID,
    ADD COLUMN "source_system_library_config_version_id" UUID;

ALTER TABLE "sensor_config"
    ADD CONSTRAINT "sensor_config_source_sensor_library_config_version_id_fkey"
        FOREIGN KEY ("source_sensor_library_config_version_id")
        REFERENCES "sensor_library_config_version"("id")
        ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "sensor_config_source_system_library_config_version_id_fkey"
        FOREIGN KEY ("source_system_library_config_version_id")
        REFERENCES "system_library_config_version"("id")
        ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "sensor_config_single_source_check" CHECK (
        num_nonnulls(
            "source_sensor_library_config_version_id",
            "source_system_library_config_version_id"
        ) <= 1
    );

ALTER TABLE "datalogger_config"
    ADD COLUMN "source_datalogger_library_config_version_id" UUID,
    ADD COLUMN "source_system_library_config_version_id" UUID;

ALTER TABLE "datalogger_config"
    ADD CONSTRAINT "datalogger_config_source_datalogger_library_config_version_fkey"
        FOREIGN KEY ("source_datalogger_library_config_version_id")
        REFERENCES "datalogger_library_config_version"("id")
        ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "datalogger_config_source_system_library_config_version_id_fkey"
        FOREIGN KEY ("source_system_library_config_version_id")
        REFERENCES "system_library_config_version"("id")
        ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "datalogger_config_single_source_check" CHECK (
        num_nonnulls(
            "source_datalogger_library_config_version_id",
            "source_system_library_config_version_id"
        ) <= 1
    );

-- The firmware version a library version was saved with, so applying it to a
-- board running other firmware can warn. NULL when unknown.
ALTER TABLE "sensor_library_config_version" ADD COLUMN "firmware_version" TEXT;
ALTER TABLE "datalogger_library_config_version" ADD COLUMN "firmware_version" TEXT;
ALTER TABLE "system_library_config_version" ADD COLUMN "firmware_version" TEXT;
