-- CreateTable
CREATE TABLE "notification" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "account_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "resource_type" TEXT,
    "resource_id" UUID,
    "read_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_account_id_read_at_idx" ON "notification"("account_id", "read_at");

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
