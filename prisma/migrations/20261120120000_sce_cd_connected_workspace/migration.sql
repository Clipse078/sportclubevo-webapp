-- SCE connected Vereinsentwicklung workspace — additive schema

-- Task context: link Aufgaben directly to Ziele
ALTER TYPE "TaskContextType" ADD VALUE IF NOT EXISTS 'TARGET';

-- ClubStrategy scope (whole club + optional Org-Einheit strategies)
CREATE TYPE "ClubStrategyScopeType" AS ENUM ('CLUB', 'ORG_UNIT');

ALTER TABLE "ClubStrategy" ADD COLUMN IF NOT EXISTS "scopeType" "ClubStrategyScopeType" NOT NULL DEFAULT 'CLUB';
ALTER TABLE "ClubStrategy" ADD COLUMN IF NOT EXISTS "scopeOrgUnitId" TEXT;
ALTER TABLE "ClubStrategy" ADD COLUMN IF NOT EXISTS "title" TEXT;

-- Drop single-row-per-tenant constraint; preserve data as whole-club rows
DROP INDEX IF EXISTS "ClubStrategy_tenantId_key";

CREATE UNIQUE INDEX IF NOT EXISTS "ClubStrategy_tenant_club_scope_key"
  ON "ClubStrategy" ("tenantId")
  WHERE "scopeType" = 'CLUB' AND "scopeOrgUnitId" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "ClubStrategy_tenant_org_unit_scope_key"
  ON "ClubStrategy" ("tenantId", "scopeOrgUnitId")
  WHERE "scopeType" = 'ORG_UNIT' AND "scopeOrgUnitId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "ClubStrategy_tenant_scope_idx"
  ON "ClubStrategy" ("tenantId", "scopeType", "scopeOrgUnitId");