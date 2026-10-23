-- FIN-03A — management finance actual entries (not general ledger)

CREATE TYPE "FinanceActualEntrySource" AS ENUM ('MANUAL', 'IMPORT', 'SYSTEM');

CREATE TABLE "FinanceActualEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "financeYearId" TEXT NOT NULL,
    "financialAccountId" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "description" TEXT,
    "source" "FinanceActualEntrySource" NOT NULL DEFAULT 'MANUAL',
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceActualEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FinanceActualEntry_tenantId_financeYearId_idx" ON "FinanceActualEntry"("tenantId", "financeYearId");
CREATE INDEX "FinanceActualEntry_tenantId_financialAccountId_idx" ON "FinanceActualEntry"("tenantId", "financialAccountId");
CREATE INDEX "FinanceActualEntry_tenantId_financeYearId_effectiveDate_idx" ON "FinanceActualEntry"("tenantId", "financeYearId", "effectiveDate");
CREATE INDEX "FinanceActualEntry_financialAccountId_idx" ON "FinanceActualEntry"("financialAccountId");

ALTER TABLE "FinanceActualEntry" ADD CONSTRAINT "FinanceActualEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinanceActualEntry" ADD CONSTRAINT "FinanceActualEntry_financeYearId_fkey" FOREIGN KEY ("financeYearId") REFERENCES "FinanceYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinanceActualEntry" ADD CONSTRAINT "FinanceActualEntry_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinanceActualEntry" ADD CONSTRAINT "FinanceActualEntry_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinanceActualEntry" ADD CONSTRAINT "FinanceActualEntry_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
