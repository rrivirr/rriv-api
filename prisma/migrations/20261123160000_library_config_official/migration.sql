-- RRIV-curated configs. Only admins set this, and an official config is
-- always public.
ALTER TABLE "sensor_library_config" ADD COLUMN "is_official" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "datalogger_library_config" ADD COLUMN "is_official" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "system_library_config" ADD COLUMN "is_official" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "sensor_library_config"
    ADD CONSTRAINT "sensor_library_config_official_public_check" CHECK (NOT "is_official" OR "isPublic");
ALTER TABLE "datalogger_library_config"
    ADD CONSTRAINT "datalogger_library_config_official_public_check" CHECK (NOT "is_official" OR "isPublic");
ALTER TABLE "system_library_config"
    ADD CONSTRAINT "system_library_config_official_public_check" CHECK (NOT "is_official" OR "isPublic");
