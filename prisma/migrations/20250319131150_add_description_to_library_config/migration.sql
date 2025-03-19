-- AlterTable
ALTER TABLE "datalogger_library_config" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "datalogger_library_config_version" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "sensor_library_config" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "sensor_library_config_version" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "system_library_config" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "system_library_config_version" ADD COLUMN     "description" TEXT;
