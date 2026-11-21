-- SCE public reference: tenant-scoped foundation → global allocator (STAGE upgrade path).
-- Preserves existing scePublicNumber values when globally unique; aborts before any
-- constraint change when cross-tenant collisions exist (assigned or legacy counter reservation).

DO $$
DECLARE
  collision_count INTEGER;
BEGIN
  IF to_regclass('public."TenantScePublicNumberSequence"') IS NULL THEN
    RAISE EXCEPTION 'SCE_PUBLIC_REFERENCE_GLOBAL_CONVERSION blocked: expected TenantScePublicNumberSequence (apply tenant foundation first)';
  END IF;

  IF to_regclass('public."ScePublicNumberSequence"') IS NOT NULL THEN
    RAISE EXCEPTION 'SCE_PUBLIC_REFERENCE_GLOBAL_CONVERSION blocked: ScePublicNumberSequence already exists';
  END IF;

  WITH assigned AS (
    SELECT "scePublicNumber", "tenantId" FROM "ClubStrategy" WHERE "scePublicNumber" IS NOT NULL
    UNION ALL
    SELECT "scePublicNumber", "tenantId" FROM "Target" WHERE "scePublicNumber" IS NOT NULL
    UNION ALL
    SELECT "scePublicNumber", "tenantId" FROM "Task" WHERE "scePublicNumber" IS NOT NULL
    UNION ALL
    SELECT "scePublicNumber", "tenantId" FROM "ClubMeldung" WHERE "scePublicNumber" IS NOT NULL
  ),
  duplicate_assigned AS (
    SELECT "scePublicNumber"
    FROM assigned
    GROUP BY "scePublicNumber"
    HAVING COUNT(*) > 1
  ),
  tenant_reserved AS (
    SELECT
      t."tenantId",
      gs.n AS "scePublicNumber"
    FROM "TenantScePublicNumberSequence" t
    JOIN LATERAL generate_series(1, GREATEST(t."nextNumber" - 1, 0)) AS gs(n) ON TRUE
  ),
  duplicate_reserved AS (
    SELECT "scePublicNumber"
    FROM tenant_reserved
    GROUP BY "scePublicNumber"
    HAVING COUNT(DISTINCT "tenantId") > 1
  ),
  conflicts AS (
    SELECT "scePublicNumber" FROM duplicate_assigned
    UNION
    SELECT "scePublicNumber" FROM duplicate_reserved
  )
  SELECT COUNT(*)::INTEGER INTO collision_count FROM conflicts;

  IF collision_count > 0 THEN
    RAISE EXCEPTION
      'SCE_PUBLIC_REFERENCE_GLOBAL_COLLISION: % duplicate scePublicNumber value(s) across tenants; abort before renumbering',
      collision_count;
  END IF;
END $$;

CREATE TABLE "ScePublicNumberSequence" (
    "id" TEXT NOT NULL,
    "nextNumber" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "ScePublicNumberSequence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScePublicNumberLedger" (
    "scePublicNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScePublicNumberLedger_pkey" PRIMARY KEY ("scePublicNumber")
);

INSERT INTO "ScePublicNumberLedger" ("scePublicNumber", "createdAt")
SELECT DISTINCT issued."scePublicNumber", CURRENT_TIMESTAMP
FROM (
  SELECT "scePublicNumber" FROM "ClubStrategy" WHERE "scePublicNumber" IS NOT NULL
  UNION
  SELECT "scePublicNumber" FROM "Target" WHERE "scePublicNumber" IS NOT NULL
  UNION
  SELECT "scePublicNumber" FROM "Task" WHERE "scePublicNumber" IS NOT NULL
  UNION
  SELECT "scePublicNumber" FROM "ClubMeldung" WHERE "scePublicNumber" IS NOT NULL
  UNION
  SELECT gs.n AS "scePublicNumber"
  FROM "TenantScePublicNumberSequence" t
  JOIN LATERAL generate_series(1, GREATEST(t."nextNumber" - 1, 0)) AS gs(n) ON TRUE
) AS issued
WHERE issued."scePublicNumber" IS NOT NULL;

INSERT INTO "ScePublicNumberSequence" ("id", "nextNumber")
SELECT
  'global',
  COALESCE(
    (SELECT MAX("scePublicNumber") + 1 FROM "ScePublicNumberLedger"),
    1
  );

DROP INDEX "ClubStrategy_tenantId_scePublicNumber_key";
DROP INDEX "Target_tenantId_scePublicNumber_key";
DROP INDEX "Task_tenantId_scePublicNumber_key";
DROP INDEX "ClubMeldung_tenantId_scePublicNumber_key";

CREATE UNIQUE INDEX "ClubStrategy_scePublicNumber_key" ON "ClubStrategy"("scePublicNumber");
CREATE UNIQUE INDEX "Target_scePublicNumber_key" ON "Target"("scePublicNumber");
CREATE UNIQUE INDEX "Task_scePublicNumber_key" ON "Task"("scePublicNumber");
CREATE UNIQUE INDEX "ClubMeldung_scePublicNumber_key" ON "ClubMeldung"("scePublicNumber");

DROP TABLE "TenantScePublicNumberSequence";