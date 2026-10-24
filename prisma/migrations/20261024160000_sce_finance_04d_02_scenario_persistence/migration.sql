-- SCE-FIN-04D-02 — scenario persistence & lifecycle (additive, tenant-safe).

CREATE TYPE "FinanceScenarioAssumptionKind" AS ENUM (
  'PERCENT_CHANGE',
  'DELTA_AMOUNT',
  'ABSOLUTE_AMOUNT',
  'EXCLUDE_ACCOUNT'
);

CREATE TABLE "FinanceScenario" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "financeYearId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "sourceForecastId" TEXT NOT NULL,
  "sourceForecastVersionId" TEXT NOT NULL,
  "baselineAsOfDate" DATE,
  "baselineActualsThroughDate" DATE,
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FinanceScenario_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinanceScenarioBaselineLine" (
  "id" TEXT NOT NULL,
  "scenarioId" TEXT NOT NULL,
  "financialAccountId" TEXT NOT NULL,
  "amountMinor" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FinanceScenarioBaselineLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinanceScenarioAssumption" (
  "id" TEXT NOT NULL,
  "scenarioId" TEXT NOT NULL,
  "financialAccountId" TEXT NOT NULL,
  "kind" "FinanceScenarioAssumptionKind" NOT NULL,
  "percentBasisPoints" INTEGER,
  "amountMinorDelta" INTEGER,
  "absoluteAmountMinor" INTEGER,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FinanceScenarioAssumption_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FinanceScenario_tenantId_financeYearId_idx"
  ON "FinanceScenario"("tenantId", "financeYearId");

CREATE INDEX "FinanceScenario_tenantId_financeYearId_archivedAt_idx"
  ON "FinanceScenario"("tenantId", "financeYearId", "archivedAt");

CREATE INDEX "FinanceScenario_sourceForecastVersionId_idx"
  ON "FinanceScenario"("sourceForecastVersionId");

CREATE INDEX "FinanceScenarioBaselineLine_scenarioId_idx"
  ON "FinanceScenarioBaselineLine"("scenarioId");

CREATE INDEX "FinanceScenarioBaselineLine_financialAccountId_idx"
  ON "FinanceScenarioBaselineLine"("financialAccountId");

CREATE UNIQUE INDEX "FinanceScenarioBaselineLine_scenarioId_financialAccountId_key"
  ON "FinanceScenarioBaselineLine"("scenarioId", "financialAccountId");

CREATE INDEX "FinanceScenarioAssumption_scenarioId_idx"
  ON "FinanceScenarioAssumption"("scenarioId");

CREATE INDEX "FinanceScenarioAssumption_financialAccountId_idx"
  ON "FinanceScenarioAssumption"("financialAccountId");

CREATE UNIQUE INDEX "FinanceScenarioAssumption_scenarioId_financialAccountId_key"
  ON "FinanceScenarioAssumption"("scenarioId", "financialAccountId");

-- Prisma cannot express partial unique indexes. Active scenario names are unique within
-- tenant + finance year using normalized (trim + lower-case) name; archived rows do not block reuse.
CREATE UNIQUE INDEX "FinanceScenario_active_name_unique_idx"
  ON "FinanceScenario" (
    "tenantId",
    "financeYearId",
    LOWER(TRIM("name"))
  )
  WHERE "archivedAt" IS NULL;

ALTER TABLE "FinanceScenario"
  ADD CONSTRAINT "FinanceScenario_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FinanceScenario"
  ADD CONSTRAINT "FinanceScenario_financeYearId_fkey"
  FOREIGN KEY ("financeYearId") REFERENCES "FinanceYear"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FinanceScenario"
  ADD CONSTRAINT "FinanceScenario_sourceForecastId_fkey"
  FOREIGN KEY ("sourceForecastId") REFERENCES "FinanceForecast"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FinanceScenario"
  ADD CONSTRAINT "FinanceScenario_sourceForecastVersionId_fkey"
  FOREIGN KEY ("sourceForecastVersionId") REFERENCES "FinanceForecastVersion"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FinanceScenario"
  ADD CONSTRAINT "FinanceScenario_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FinanceScenario"
  ADD CONSTRAINT "FinanceScenario_updatedByUserId_fkey"
  FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FinanceScenarioBaselineLine"
  ADD CONSTRAINT "FinanceScenarioBaselineLine_scenarioId_fkey"
  FOREIGN KEY ("scenarioId") REFERENCES "FinanceScenario"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FinanceScenarioBaselineLine"
  ADD CONSTRAINT "FinanceScenarioBaselineLine_financialAccountId_fkey"
  FOREIGN KEY ("financialAccountId") REFERENCES "FinancialAccount"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FinanceScenarioAssumption"
  ADD CONSTRAINT "FinanceScenarioAssumption_scenarioId_fkey"
  FOREIGN KEY ("scenarioId") REFERENCES "FinanceScenario"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FinanceScenarioAssumption"
  ADD CONSTRAINT "FinanceScenarioAssumption_financialAccountId_fkey"
  FOREIGN KEY ("financialAccountId") REFERENCES "FinancialAccount"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
