-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateTable
CREATE TABLE "account" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMP(6),

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "serial_number" TEXT NOT NULL,
    "unique_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMP(6),

    CONSTRAINT "device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "context" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "account_id" UUID NOT NULL,
    "started_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(6),
    "archived_at" TIMESTAMP(6),

    CONSTRAINT "context_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_context" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "device_id" UUID NOT NULL,
    "context_id" UUID NOT NULL,
    "assigned_device_name" TEXT NOT NULL,
    "started_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(6),
    "archived_at" TIMESTAMP(6),

    CONSTRAINT "device_context_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telemeter" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "device_id" UUID NOT NULL,
    "protocol" TEXT NOT NULL,
    "telemeter_identifier" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMP(6),

    CONSTRAINT "telemeter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bind" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "device_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "bound_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unbound_at" TIMESTAMP(6),
    "archived_at" TIMESTAMP(6),

    CONSTRAINT "bind_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "datalogger_driver" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "validation" JSONB NOT NULL,
    "creator_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMP(6),

    CONSTRAINT "datalogger_driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "datalogger_config" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "config" JSONB NOT NULL,
    "datalogger_driver_id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMP(6),

    CONSTRAINT "datalogger_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "datalogger_library_config" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "creator_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMP(6),

    CONSTRAINT "datalogger_library_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "datalogger_library_config_version" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "datalogger_config_id" UUID NOT NULL,
    "datalogger_library_config_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "creator_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMP(6),

    CONSTRAINT "datalogger_library_config_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_snapshot" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT,
    "device_context_id" UUID NOT NULL,
    "datalogger_config_id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "configured_at" TIMESTAMP(6) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMP(6),

    CONSTRAINT "config_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_library_config" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "creator_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMP(6),

    CONSTRAINT "system_library_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_library_config_version" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "config_snapshot_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "creator_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMP(6),

    CONSTRAINT "system_library_config_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sensor_driver" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "validation" JSONB NOT NULL,
    "creator_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMP(6),

    CONSTRAINT "sensor_driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sensor_config" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "config" JSONB NOT NULL,
    "sensor_driver_id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMP(6),

    CONSTRAINT "sensor_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sensor_library_config" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "creator_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMP(6),

    CONSTRAINT "sensor_library_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sensor_library_config_version" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "sensor_config_id" UUID NOT NULL,
    "sensor_library_config_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "creator_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMP(6),

    CONSTRAINT "sensor_library_config_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sensor_config_snapshot" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "sensor_config_id" UUID NOT NULL,
    "config_snapshot_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMP(6),

    CONSTRAINT "sensor_config_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "creator_id" UUID NOT NULL,
    "location_name" TEXT NOT NULL,
    "location_shape" geography(MultiPolygon, 4326) NOT NULL,
    "location_coordinate" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMP(6),

    CONSTRAINT "project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "creator_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "project_id" UUID,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "location_disposition" TEXT NOT NULL,
    "site_geography" geography(MultiPolygon, 4326) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMP(6),

    CONSTRAINT "site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "position" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "creator_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "altitude" DOUBLE PRECISION,
    "depth" DOUBLE PRECISION,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMP(6),

    CONSTRAINT "position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "installation" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "device_id" UUID NOT NULL,
    "position_id" UUID NOT NULL,
    "installer_id" UUID NOT NULL,
    "installed_at" TIMESTAMP(6) NOT NULL,
    "removed_at" TIMESTAMP(6),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMP(6),

    CONSTRAINT "installation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "started_at" TIMESTAMP(6) NOT NULL,
    "ended_at" TIMESTAMP(6) NOT NULL,
    "type" TEXT NOT NULL,
    "config_snapshot_id" UUID,
    "installation_id" UUID,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMP(6),

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "account_email_key" ON "account"("email");

-- CreateIndex
CREATE UNIQUE INDEX "device_serial_number_key" ON "device"("serial_number");

-- CreateIndex
CREATE UNIQUE INDEX "device_unique_name_key" ON "device"("unique_name");

-- CreateIndex
CREATE UNIQUE INDEX "datalogger_driver_name_key" ON "datalogger_driver"("name");

-- CreateIndex
CREATE UNIQUE INDEX "datalogger_library_config_name_key" ON "datalogger_library_config"("name");

-- CreateIndex
CREATE UNIQUE INDEX "datalogger_library_config_version_datalogger_library_config_key" ON "datalogger_library_config_version"("datalogger_library_config_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "config_snapshot_name_key" ON "config_snapshot"("name");

-- CreateIndex
CREATE UNIQUE INDEX "system_library_config_name_key" ON "system_library_config"("name");

-- CreateIndex
CREATE UNIQUE INDEX "sensor_driver_name_key" ON "sensor_driver"("name");

-- CreateIndex
CREATE UNIQUE INDEX "sensor_library_config_name_key" ON "sensor_library_config"("name");

-- CreateIndex
CREATE UNIQUE INDEX "sensor_library_config_version_sensor_library_config_id_vers_key" ON "sensor_library_config_version"("sensor_library_config_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "sensor_config_snapshot_sensor_config_id_config_snapshot_id_key" ON "sensor_config_snapshot"("sensor_config_id", "config_snapshot_id");

-- CreateIndex
CREATE UNIQUE INDEX "site_code_key" ON "site"("code");

-- CreateIndex
CREATE UNIQUE INDEX "position_code_key" ON "position"("code");

-- AddForeignKey
ALTER TABLE "context" ADD CONSTRAINT "context_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_context" ADD CONSTRAINT "device_context_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_context" ADD CONSTRAINT "device_context_context_id_fkey" FOREIGN KEY ("context_id") REFERENCES "context"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telemeter" ADD CONSTRAINT "telemeter_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bind" ADD CONSTRAINT "bind_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bind" ADD CONSTRAINT "bind_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "datalogger_driver" ADD CONSTRAINT "datalogger_driver_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "datalogger_config" ADD CONSTRAINT "datalogger_config_datalogger_driver_id_fkey" FOREIGN KEY ("datalogger_driver_id") REFERENCES "datalogger_driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "datalogger_config" ADD CONSTRAINT "datalogger_config_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "datalogger_library_config" ADD CONSTRAINT "datalogger_library_config_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "datalogger_library_config_version" ADD CONSTRAINT "datalogger_library_config_version_datalogger_config_id_fkey" FOREIGN KEY ("datalogger_config_id") REFERENCES "datalogger_config"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "datalogger_library_config_version" ADD CONSTRAINT "datalogger_library_config_version_datalogger_library_confi_fkey" FOREIGN KEY ("datalogger_library_config_id") REFERENCES "datalogger_library_config"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "datalogger_library_config_version" ADD CONSTRAINT "datalogger_library_config_version_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_snapshot" ADD CONSTRAINT "config_snapshot_device_context_id_fkey" FOREIGN KEY ("device_context_id") REFERENCES "device_context"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_snapshot" ADD CONSTRAINT "config_snapshot_datalogger_config_id_fkey" FOREIGN KEY ("datalogger_config_id") REFERENCES "datalogger_config"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_snapshot" ADD CONSTRAINT "config_snapshot_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_library_config" ADD CONSTRAINT "system_library_config_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_library_config_version" ADD CONSTRAINT "system_library_config_version_config_snapshot_id_fkey" FOREIGN KEY ("config_snapshot_id") REFERENCES "config_snapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_library_config_version" ADD CONSTRAINT "system_library_config_version_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensor_driver" ADD CONSTRAINT "sensor_driver_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensor_config" ADD CONSTRAINT "sensor_config_sensor_driver_id_fkey" FOREIGN KEY ("sensor_driver_id") REFERENCES "sensor_driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensor_config" ADD CONSTRAINT "sensor_config_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensor_library_config" ADD CONSTRAINT "sensor_library_config_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensor_library_config_version" ADD CONSTRAINT "sensor_library_config_version_sensor_config_id_fkey" FOREIGN KEY ("sensor_config_id") REFERENCES "sensor_config"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensor_library_config_version" ADD CONSTRAINT "sensor_library_config_version_sensor_library_config_id_fkey" FOREIGN KEY ("sensor_library_config_id") REFERENCES "sensor_library_config"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensor_library_config_version" ADD CONSTRAINT "sensor_library_config_version_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensor_config_snapshot" ADD CONSTRAINT "sensor_config_snapshot_sensor_config_id_fkey" FOREIGN KEY ("sensor_config_id") REFERENCES "sensor_config"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensor_config_snapshot" ADD CONSTRAINT "sensor_config_snapshot_config_snapshot_id_fkey" FOREIGN KEY ("config_snapshot_id") REFERENCES "config_snapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site" ADD CONSTRAINT "site_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site" ADD CONSTRAINT "site_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "position" ADD CONSTRAINT "position_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "position" ADD CONSTRAINT "position_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installation" ADD CONSTRAINT "installation_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installation" ADD CONSTRAINT "installation_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installation" ADD CONSTRAINT "installation_installer_id_fkey" FOREIGN KEY ("installer_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_config_snapshot_id_fkey" FOREIGN KEY ("config_snapshot_id") REFERENCES "config_snapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_installation_id_fkey" FOREIGN KEY ("installation_id") REFERENCES "installation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
