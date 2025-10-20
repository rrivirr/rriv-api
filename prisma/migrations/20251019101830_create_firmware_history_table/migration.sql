-- CreateTable
CREATE TABLE "device_firmware_history" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "version" TEXT NOT NULL,
    "device_context_id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "installedAt" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_firmware_history_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "device_firmware_history" ADD CONSTRAINT "device_firmware_history_device_context_id_fkey" FOREIGN KEY ("device_context_id") REFERENCES "device_context"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_firmware_history" ADD CONSTRAINT "device_firmware_history_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
