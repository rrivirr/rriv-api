-- CreateTable
CREATE TABLE "context_share" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "context_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "relation" TEXT NOT NULL,
    "created_by" UUID,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "context_share_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "context_share_context_id_account_id_relation_key" ON "context_share"("context_id", "account_id", "relation");

-- AddForeignKey
ALTER TABLE "context_share" ADD CONSTRAINT "context_share_context_id_fkey" FOREIGN KEY ("context_id") REFERENCES "context"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "context_share" ADD CONSTRAINT "context_share_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "auth_sync" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "resource_type" TEXT NOT NULL,
    "resource_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" JSONB,
    "last_job_id" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_sync_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auth_sync_resource_type_resource_id_key" ON "auth_sync"("resource_type", "resource_id");
