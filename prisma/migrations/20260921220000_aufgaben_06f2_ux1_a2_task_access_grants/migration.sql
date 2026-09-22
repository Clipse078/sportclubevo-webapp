-- AUFGABEN-06F2-UX1-A2 — additive Task visibility access grants (no broadening of existing tasks).

CREATE TYPE "TaskAccessGrantSubjectType" AS ENUM ('ORG_UNIT', 'USER');

CREATE TABLE "TaskAccessGrant" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "subjectType" "TaskAccessGrantSubjectType" NOT NULL,
    "orgUnitId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskAccessGrant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TaskSeriesAccessGrant" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "subjectType" "TaskAccessGrantSubjectType" NOT NULL,
    "orgUnitId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskSeriesAccessGrant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TaskAccessGrant_taskId_orgUnitId_key" ON "TaskAccessGrant"("taskId", "orgUnitId");
CREATE UNIQUE INDEX "TaskAccessGrant_taskId_userId_key" ON "TaskAccessGrant"("taskId", "userId");
CREATE INDEX "TaskAccessGrant_tenantId_idx" ON "TaskAccessGrant"("tenantId");
CREATE INDEX "TaskAccessGrant_tenantId_taskId_idx" ON "TaskAccessGrant"("tenantId", "taskId");
CREATE INDEX "TaskAccessGrant_tenantId_orgUnitId_idx" ON "TaskAccessGrant"("tenantId", "orgUnitId");
CREATE INDEX "TaskAccessGrant_tenantId_userId_idx" ON "TaskAccessGrant"("tenantId", "userId");

CREATE UNIQUE INDEX "TaskSeriesAccessGrant_seriesId_orgUnitId_key" ON "TaskSeriesAccessGrant"("seriesId", "orgUnitId");
CREATE UNIQUE INDEX "TaskSeriesAccessGrant_seriesId_userId_key" ON "TaskSeriesAccessGrant"("seriesId", "userId");
CREATE INDEX "TaskSeriesAccessGrant_tenantId_idx" ON "TaskSeriesAccessGrant"("tenantId");
CREATE INDEX "TaskSeriesAccessGrant_tenantId_seriesId_idx" ON "TaskSeriesAccessGrant"("tenantId", "seriesId");
CREATE INDEX "TaskSeriesAccessGrant_tenantId_orgUnitId_idx" ON "TaskSeriesAccessGrant"("tenantId", "orgUnitId");
CREATE INDEX "TaskSeriesAccessGrant_tenantId_userId_idx" ON "TaskSeriesAccessGrant"("tenantId", "userId");

ALTER TABLE "TaskAccessGrant" ADD CONSTRAINT "TaskAccessGrant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskAccessGrant" ADD CONSTRAINT "TaskAccessGrant_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskAccessGrant" ADD CONSTRAINT "TaskAccessGrant_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "OrgUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskAccessGrant" ADD CONSTRAINT "TaskAccessGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskSeriesAccessGrant" ADD CONSTRAINT "TaskSeriesAccessGrant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskSeriesAccessGrant" ADD CONSTRAINT "TaskSeriesAccessGrant_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "TaskSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskSeriesAccessGrant" ADD CONSTRAINT "TaskSeriesAccessGrant_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "OrgUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskSeriesAccessGrant" ADD CONSTRAINT "TaskSeriesAccessGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill canonical org-unit grants from legacy Task.orgUnitId (preserves effective visibility, no broadening).
INSERT INTO "TaskAccessGrant" ("id", "tenantId", "taskId", "subjectType", "orgUnitId", "userId", "createdAt")
SELECT
  gen_random_uuid()::text,
  t."tenantId",
  t."id",
  'ORG_UNIT'::"TaskAccessGrantSubjectType",
  t."orgUnitId",
  NULL,
  NOW()
FROM "Task" t
WHERE t."visibilityScope" = 'ORG_UNIT'
  AND t."orgUnitId" IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO "TaskSeriesAccessGrant" ("id", "tenantId", "seriesId", "subjectType", "orgUnitId", "userId", "createdAt")
SELECT
  gen_random_uuid()::text,
  s."tenantId",
  s."id",
  'ORG_UNIT'::"TaskAccessGrantSubjectType",
  s."orgUnitId",
  NULL,
  NOW()
FROM "TaskSeries" s
WHERE s."visibilityScope" = 'ORG_UNIT'
  AND s."orgUnitId" IS NOT NULL
ON CONFLICT DO NOTHING;
