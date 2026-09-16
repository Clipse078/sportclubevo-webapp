-- PLANNING-HUB-02A — tenant dressing-room occupancy presets + per-activity overrides.

CREATE TYPE "DressingRoomOccupancyMode" AS ENUM ('DEFAULT', 'CUSTOM');

CREATE TABLE "TenantDressingRoomOccupancyPreset" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "trainingBeforeMinutes" INTEGER NOT NULL DEFAULT 30,
    "trainingAfterMinutes" INTEGER NOT NULL DEFAULT 30,
    "matchBeforeMinutes" INTEGER NOT NULL DEFAULT 60,
    "matchAfterMinutes" INTEGER NOT NULL DEFAULT 45,
    "tournamentBeforeMinutes" INTEGER NOT NULL DEFAULT 60,
    "tournamentAfterMinutes" INTEGER NOT NULL DEFAULT 60,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantDressingRoomOccupancyPreset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantDressingRoomOccupancyPreset_tenantId_key" ON "TenantDressingRoomOccupancyPreset"("tenantId");

ALTER TABLE "TenantDressingRoomOccupancyPreset" ADD CONSTRAINT "TenantDressingRoomOccupancyPreset_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TrainingSession" ADD COLUMN "dressingRoomOccupancyMode" "DressingRoomOccupancyMode" NOT NULL DEFAULT 'DEFAULT';
ALTER TABLE "TrainingSession" ADD COLUMN "dressingRoomBeforeMinutes" INTEGER;
ALTER TABLE "TrainingSession" ADD COLUMN "dressingRoomAfterMinutes" INTEGER;

ALTER TABLE "Event" ADD COLUMN "dressingRoomOccupancyMode" "DressingRoomOccupancyMode" NOT NULL DEFAULT 'DEFAULT';
ALTER TABLE "Event" ADD COLUMN "dressingRoomBeforeMinutes" INTEGER;
ALTER TABLE "Event" ADD COLUMN "dressingRoomAfterMinutes" INTEGER;

ALTER TABLE "TenantDressingRoomOccupancyPreset" ADD CONSTRAINT "TenantDressingRoomOccupancyPreset_trainingBefore_non_negative" CHECK ("trainingBeforeMinutes" >= 0);
ALTER TABLE "TenantDressingRoomOccupancyPreset" ADD CONSTRAINT "TenantDressingRoomOccupancyPreset_trainingAfter_non_negative" CHECK ("trainingAfterMinutes" >= 0);
ALTER TABLE "TenantDressingRoomOccupancyPreset" ADD CONSTRAINT "TenantDressingRoomOccupancyPreset_matchBefore_non_negative" CHECK ("matchBeforeMinutes" >= 0);
ALTER TABLE "TenantDressingRoomOccupancyPreset" ADD CONSTRAINT "TenantDressingRoomOccupancyPreset_matchAfter_non_negative" CHECK ("matchAfterMinutes" >= 0);
ALTER TABLE "TenantDressingRoomOccupancyPreset" ADD CONSTRAINT "TenantDressingRoomOccupancyPreset_tournamentBefore_non_negative" CHECK ("tournamentBeforeMinutes" >= 0);
ALTER TABLE "TenantDressingRoomOccupancyPreset" ADD CONSTRAINT "TenantDressingRoomOccupancyPreset_tournamentAfter_non_negative" CHECK ("tournamentAfterMinutes" >= 0);
