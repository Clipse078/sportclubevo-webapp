-- FIN-04B-04: per-account methodology and assessment on projection lines; MIXED at version level.

ALTER TYPE "FinanceProjectionMethodologyFamily" ADD VALUE IF NOT EXISTS 'MIXED';

ALTER TABLE "FinanceProjectionLine"
  ADD COLUMN IF NOT EXISTS "methodologyFamily" "FinanceProjectionMethodologyFamily",
  ADD COLUMN IF NOT EXISTS "dataSufficiency" "FinanceProjectionDataSufficiency",
  ADD COLUMN IF NOT EXISTS "confidence" "FinanceProjectionConfidence";

UPDATE "FinanceProjectionLine" AS l
SET
  "methodologyFamily" = COALESCE(l."methodologyFamily", v."methodologyFamily"),
  "dataSufficiency" = COALESCE(l."dataSufficiency", v."dataSufficiency"),
  "confidence" = COALESCE(l."confidence", v."confidence")
FROM "FinanceProjectionVersion" AS v
WHERE l."projectionVersionId" = v."id"
  AND (l."methodologyFamily" IS NULL OR l."dataSufficiency" IS NULL OR l."confidence" IS NULL);

ALTER TABLE "FinanceProjectionLine"
  ALTER COLUMN "methodologyFamily" SET NOT NULL,
  ALTER COLUMN "dataSufficiency" SET NOT NULL,
  ALTER COLUMN "confidence" SET NOT NULL;
