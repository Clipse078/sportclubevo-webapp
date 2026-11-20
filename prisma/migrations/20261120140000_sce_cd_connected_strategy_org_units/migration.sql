-- PR #1017 — 1:n Org-Einheit assignment per ClubStrategy (additive; legacy scopeOrgUnitId retained).

CREATE TABLE IF NOT EXISTS "ClubStrategyOrgUnitAssignment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "clubStrategyId" TEXT NOT NULL,
  "orgUnitId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClubStrategyOrgUnitAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ClubStrategyOrgUnitAssignment_clubStrategyId_orgUnitId_key"
  ON "ClubStrategyOrgUnitAssignment" ("clubStrategyId", "orgUnitId");

CREATE INDEX IF NOT EXISTS "ClubStrategyOrgUnitAssignment_tenantId_idx"
  ON "ClubStrategyOrgUnitAssignment" ("tenantId");

CREATE INDEX IF NOT EXISTS "ClubStrategyOrgUnitAssignment_clubStrategyId_idx"
  ON "ClubStrategyOrgUnitAssignment" ("clubStrategyId");

CREATE INDEX IF NOT EXISTS "ClubStrategyOrgUnitAssignment_orgUnitId_idx"
  ON "ClubStrategyOrgUnitAssignment" ("orgUnitId");

ALTER TABLE "ClubStrategyOrgUnitAssignment"
  ADD CONSTRAINT "ClubStrategyOrgUnitAssignment_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClubStrategyOrgUnitAssignment"
  ADD CONSTRAINT "ClubStrategyOrgUnitAssignment_clubStrategyId_fkey"
  FOREIGN KEY ("clubStrategyId") REFERENCES "ClubStrategy" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClubStrategyOrgUnitAssignment"
  ADD CONSTRAINT "ClubStrategyOrgUnitAssignment_orgUnitId_fkey"
  FOREIGN KEY ("orgUnitId") REFERENCES "OrgUnit" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "ClubStrategyOrgUnitAssignment" ("id", "tenantId", "clubStrategyId", "orgUnitId", "createdAt")
SELECT
  md5("ClubStrategy"."id" || ':' || "ClubStrategy"."scopeOrgUnitId"),
  "ClubStrategy"."tenantId",
  "ClubStrategy"."id",
  "ClubStrategy"."scopeOrgUnitId",
  CURRENT_TIMESTAMP
FROM "ClubStrategy"
WHERE "ClubStrategy"."scopeOrgUnitId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "ClubStrategyOrgUnitAssignment" a
    WHERE a."clubStrategyId" = "ClubStrategy"."id"
      AND a."orgUnitId" = "ClubStrategy"."scopeOrgUnitId"
  );