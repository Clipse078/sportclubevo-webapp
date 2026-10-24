-- SCE-FIN-04E-02 — expected financial event persistence (additive, tenant-safe).

CREATE TYPE "FinanceExpectedFinancialEventTimingPrecision" AS ENUM (
  'EXACT_DATE',
  'MONTH',
  'DATE_RANGE'
);

CREATE TYPE "FinanceExpectedFinancialEventSourceKind" AS ENUM (
  'MANUAL'
);

CREATE TABLE "FinanceExpectedFinancialEvent" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "financeYearId" TEXT NOT NULL,
  "financialAccountId" TEXT NOT NULL,
  "expectedAmountMinor" INTEGER NOT NULL,
  "timingPrecision" "FinanceExpectedFinancialEventTimingPrecision" NOT NULL,
  "expectedDate" DATE,
  "expectedMonthStart" DATE,
  "rangeStartDate" DATE,
  "rangeEndDate" DATE,
  "sourceKind" "FinanceExpectedFinancialEventSourceKind" NOT NULL DEFAULT 'MANUAL',
  "sourceRefType" TEXT,
  "sourceRefId" TEXT,
  "description" TEXT,
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FinanceExpectedFinancialEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FinanceExpectedFinancialEvent_tenantId_financeYearId_idx"
  ON "FinanceExpectedFinancialEvent"("tenantId", "financeYearId");

CREATE INDEX "FinanceExpectedFinancialEvent_tenantId_financeYearId_financialAccountId_idx"
  ON "FinanceExpectedFinancialEvent"("tenantId", "financeYearId", "financialAccountId");

CREATE INDEX "FinanceExpectedFinancialEvent_tenantId_financialAccountId_idx"
  ON "FinanceExpectedFinancialEvent"("tenantId", "financialAccountId");

CREATE INDEX "FinanceExpectedFinancialEvent_financialAccountId_idx"
  ON "FinanceExpectedFinancialEvent"("financialAccountId");

CREATE UNIQUE INDEX "FinanceExpectedFinancialEvent_source_identity_unique_idx"
  ON "FinanceExpectedFinancialEvent"("tenantId", "sourceKind", "sourceRefType", "sourceRefId")
  WHERE "sourceRefId" IS NOT NULL AND "sourceRefType" IS NOT NULL;

ALTER TABLE "FinanceExpectedFinancialEvent"
  ADD CONSTRAINT "FinanceExpectedFinancialEvent_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FinanceExpectedFinancialEvent"
  ADD CONSTRAINT "FinanceExpectedFinancialEvent_financeYearId_fkey"
  FOREIGN KEY ("financeYearId") REFERENCES "FinanceYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FinanceExpectedFinancialEvent"
  ADD CONSTRAINT "FinanceExpectedFinancialEvent_financialAccountId_fkey"
  FOREIGN KEY ("financialAccountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FinanceExpectedFinancialEvent"
  ADD CONSTRAINT "FinanceExpectedFinancialEvent_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FinanceExpectedFinancialEvent"
  ADD CONSTRAINT "FinanceExpectedFinancialEvent_updatedByUserId_fkey"
  FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
