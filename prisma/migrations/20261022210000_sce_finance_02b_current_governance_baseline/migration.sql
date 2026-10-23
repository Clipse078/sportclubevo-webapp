-- FIN-02B: explicit current governance baseline pointer on FinanceBudget.

ALTER TABLE "FinanceBudget" ADD COLUMN "currentBaselineVersionId" TEXT;

CREATE UNIQUE INDEX "FinanceBudget_currentBaselineVersionId_key" ON "FinanceBudget"("currentBaselineVersionId");

ALTER TABLE "FinanceBudget" ADD CONSTRAINT "FinanceBudget_currentBaselineVersionId_fkey" FOREIGN KEY ("currentBaselineVersionId") REFERENCES "FinanceBudgetVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: when exactly one APPROVED version exists per budget, it becomes the current baseline.
UPDATE "FinanceBudget" AS b
SET "currentBaselineVersionId" = sub."versionId"
FROM (
  SELECT v."budgetId", MAX(v."id") AS "versionId"
  FROM "FinanceBudgetVersion" AS v
  WHERE v."status" = 'APPROVED'
  GROUP BY v."budgetId"
  HAVING COUNT(*) = 1
) AS sub
WHERE b."id" = sub."budgetId";
