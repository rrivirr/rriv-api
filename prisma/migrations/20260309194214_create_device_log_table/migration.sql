-- CreateTable
CREATE TABLE "device_log" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "log" TEXT NOT NULL,
    "device_id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_log_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "device_log" ADD CONSTRAINT "device_log_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_log" ADD CONSTRAINT "device_log_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
