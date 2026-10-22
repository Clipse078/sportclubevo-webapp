-- FIN-01C: Financial structure — accounts as leaves under reporting groups

ALTER TABLE "FinanceConfiguration" ADD COLUMN "appliedStructureTemplateKey" TEXT;

ALTER TABLE "FinancialAccount" ADD COLUMN "reportingGroupId" TEXT;

-- No production tenant financial accounts expected pre-FIN-01C.
DELETE FROM "FinancialAccount";

ALTER TABLE "FinancialAccount" DROP CONSTRAINT IF EXISTS "FinancialAccount_parentId_fkey";
DROP INDEX IF EXISTS "FinancialAccount_tenantId_parentId_idx";
ALTER TABLE "FinancialAccount" DROP COLUMN IF EXISTS "parentId";

ALTER TABLE "FinancialAccount" ALTER COLUMN "reportingGroupId" SET NOT NULL;
ALTER TABLE "FinancialAccount" ALTER COLUMN "nodeKind" SET DEFAULT 'POSTING';

ALTER TABLE "FinancialAccount" ADD CONSTRAINT "FinancialAccount_reportingGroupId_fkey"
  FOREIGN KEY ("reportingGroupId") REFERENCES "FinancialReportingGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "FinancialAccount_tenantId_reportingGroupId_idx" ON "FinancialAccount"("tenantId", "reportingGroupId");
