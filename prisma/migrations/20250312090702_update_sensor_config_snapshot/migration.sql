/*
  Warnings:

  - You are about to drop the column `configured_at` on the `config_snapshot` table. All the data in the column will be lost.
  - You are about to drop the `sensor_config_snapshot` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `name` on table `config_snapshot` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `active` to the `sensor_config` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "config_snapshot" DROP CONSTRAINT "config_snapshot_datalogger_config_id_fkey";

-- DropForeignKey
ALTER TABLE "config_snapshot" DROP CONSTRAINT "config_snapshot_device_context_id_fkey";

-- DropForeignKey
ALTER TABLE "sensor_config_snapshot" DROP CONSTRAINT "sensor_config_snapshot_config_snapshot_id_fkey";

-- DropForeignKey
ALTER TABLE "sensor_config_snapshot" DROP CONSTRAINT "sensor_config_snapshot_sensor_config_id_fkey";

-- AlterTable
ALTER TABLE "config_snapshot" DROP COLUMN "configured_at",
ALTER COLUMN "name" SET NOT NULL,
ALTER COLUMN "device_context_id" DROP NOT NULL,
ALTER COLUMN "datalogger_config_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "sensor_config" ADD COLUMN     "active" BOOLEAN NOT NULL,
ADD COLUMN     "config_snapshot_id" UUID,
ADD COLUMN     "deactivated_at" TIMESTAMP(6);

-- DropTable
DROP TABLE "sensor_config_snapshot";

-- AddForeignKey
ALTER TABLE "config_snapshot" ADD CONSTRAINT "config_snapshot_device_context_id_fkey" FOREIGN KEY ("device_context_id") REFERENCES "device_context"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_snapshot" ADD CONSTRAINT "config_snapshot_datalogger_config_id_fkey" FOREIGN KEY ("datalogger_config_id") REFERENCES "datalogger_config"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensor_config" ADD CONSTRAINT "sensor_config_config_snapshot_id_fkey" FOREIGN KEY ("config_snapshot_id") REFERENCES "config_snapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
