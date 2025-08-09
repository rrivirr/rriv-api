/*
  Warnings:

  - Added the required column `system_library_config_id` to the `system_library_config_version` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "system_library_config_version" ADD COLUMN     "system_library_config_id" UUID NOT NULL;

-- AddForeignKey
ALTER TABLE "system_library_config_version" ADD CONSTRAINT "system_library_config_version_system_library_config_id_fkey" FOREIGN KEY ("system_library_config_id") REFERENCES "system_library_config"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
