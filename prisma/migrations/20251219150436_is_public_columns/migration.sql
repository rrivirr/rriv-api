-- AlterTable
ALTER TABLE "datalogger_library_config" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "sensor_library_config" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "system_library_config" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false;
