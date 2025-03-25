/*
  Warnings:

  - You are about to drop the column `datalogger_config_id` on the `config_snapshot` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "config_snapshot" DROP CONSTRAINT "config_snapshot_datalogger_config_id_fkey";

-- AlterTable
ALTER TABLE "config_snapshot" DROP COLUMN "datalogger_config_id";

-- AlterTable
ALTER TABLE "datalogger_config" ADD COLUMN     "config_snapshot_id" UUID;

-- AddForeignKey
ALTER TABLE "datalogger_config" ADD CONSTRAINT "datalogger_config_config_snapshot_id_fkey" FOREIGN KEY ("config_snapshot_id") REFERENCES "config_snapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
