TRUNCATE device CASCADE;

-- AlterTable
ALTER TABLE "device" ADD COLUMN     "provisioned_by" UUID NOT NULL,
ADD COLUMN     "type" TEXT NOT NULL,
ADD COLUMN     "uid" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "device_uid_key" ON "device"("uid");

-- AddForeignKey
ALTER TABLE "device" ADD CONSTRAINT "device_provisioned_by_fkey" FOREIGN KEY ("provisioned_by") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
