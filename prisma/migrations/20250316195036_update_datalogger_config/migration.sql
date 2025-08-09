/*
  Warnings:

  - Added the required column `active` to the `datalogger_config` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "datalogger_config" ADD COLUMN     "active" BOOLEAN NOT NULL,
ADD COLUMN     "deactivated_at" TIMESTAMP(6);
