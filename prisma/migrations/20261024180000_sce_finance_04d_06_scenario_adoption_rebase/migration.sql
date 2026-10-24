-- SCE-FINANCE-04D-06: Scenario adoption provenance and rebase audit (additive).

ALTER TYPE "FinanceForecastRevisionSource" ADD VALUE IF NOT EXISTS 'SCENARIO_ADOPTION';

CREATE TABLE "FinanceScenarioAdoption" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "financeYearId" TEXT NOT NULL,
  "scenarioId" TEXT NOT NULL,
  "sourceScenarioUpdatedAt" TIMESTAMP(3) NOT NULL,
  "sourceForecastVersionId" TEXT NOT NULL,
  "resultingForecastVersionId" TEXT NOT NULL,
  "adoptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "adoptedByUserId" TEXT NOT NULL,

  CONSTRAINT "FinanceScenarioAdoption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinanceScenarioRebase" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "scenarioId" TEXT NOT NULL,
  "fromForecastVersionId" TEXT NOT NULL,
  "toForecastVersionId" TEXT NOT NULL,
  "rebasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "rebasedByUserId" TEXT NOT NULL,

  CONSTRAINT "FinanceScenarioRebase_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FinanceScenarioAdoption_tenantId_financeYearId_idx"
  ON "FinanceScenarioAdoption"("tenantId", "financeYearId");

CREATE INDEX "FinanceScenarioAdoption_scenarioId_idx"
  ON "FinanceScenarioAdoption"("scenarioId");

CREATE UNIQUE INDEX "FinanceScenarioAdoption_resultingForecastVersionId_key"
  ON "FinanceScenarioAdoption"("resultingForecastVersionId");

CREATE INDEX "FinanceScenarioRebase_scenarioId_idx"
  ON "FinanceScenarioRebase"("scenarioId");

CREATE INDEX "FinanceScenarioRebase_tenantId_idx"
  ON "FinanceScenarioRebase"("tenantId");

ALTER TABLE "FinanceScenarioAdoption"
  ADD CONSTRAINT "FinanceScenarioAdoption_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FinanceScenarioAdoption"
  ADD CONSTRAINT "FinanceScenarioAdoption_financeYearId_fkey"
  FOREIGN KEY ("financeYearId") REFERENCES "FinanceYear"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FinanceScenarioAdoption"
  ADD CONSTRAINT "FinanceScenarioAdoption_scenarioId_fkey"
  FOREIGN KEY ("scenarioId") REFERENCES "FinanceScenario"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FinanceScenarioAdoption"
  ADD CONSTRAINT "FinanceScenarioAdoption_sourceForecastVersionId_fkey"
  FOREIGN KEY ("sourceForecastVersionId") REFERENCES "FinanceForecastVersion"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FinanceScenarioAdoption"
  ADD CONSTRAINT "FinanceScenarioAdoption_resultingForecastVersionId_fkey"
  FOREIGN KEY ("resultingForecastVersionId") REFERENCES "FinanceForecastVersion"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FinanceScenarioAdoption"
  ADD CONSTRAINT "FinanceScenarioAdoption_adoptedByUserId_fkey"
  FOREIGN KEY ("adoptedByUserId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FinanceScenarioRebase"
  ADD CONSTRAINT "FinanceScenarioRebase_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FinanceScenarioRebase"
  ADD CONSTRAINT "FinanceScenarioRebase_scenarioId_fkey"
  FOREIGN KEY ("scenarioId") REFERENCES "FinanceScenario"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FinanceScenarioRebase"
  ADD CONSTRAINT "FinanceScenarioRebase_fromForecastVersionId_fkey"
  FOREIGN KEY ("fromForecastVersionId") REFERENCES "FinanceForecastVersion"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FinanceScenarioRebase"
  ADD CONSTRAINT "FinanceScenarioRebase_toForecastVersionId_fkey"
  FOREIGN KEY ("toForecastVersionId") REFERENCES "FinanceForecastVersion"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FinanceScenarioRebase"
  ADD CONSTRAINT "FinanceScenarioRebase_rebasedByUserId_fkey"
  FOREIGN KEY ("rebasedByUserId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
