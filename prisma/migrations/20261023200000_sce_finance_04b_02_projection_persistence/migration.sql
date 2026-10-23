-- CreateEnum
CREATE TYPE "FinanceProjectionDataSufficiency" AS ENUM ('SUFFICIENT', 'LIMITED', 'INSUFFICIENT');

-- CreateEnum
CREATE TYPE "FinanceProjectionConfidence" AS ENUM ('HIGH', 'MEDIUM', 'LOW', 'NONE');

-- CreateEnum
CREATE TYPE "FinanceProjectionMethodologyFamily" AS ENUM ('BASELINE_REFERENCE', 'RUN_RATE', 'HISTORICAL_PATTERN', 'SEASONAL_PATTERN', 'DRIVER_BASED', 'STATISTICAL', 'ENSEMBLE', 'NONE');

-- CreateEnum
CREATE TYPE "FinanceProjectionGenerationActorType" AS ENUM ('USER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "FinanceProjectionEvidenceKind" AS ENUM ('HISTORICAL_ACTUALS', 'CURRENT_YEAR_ACTUALS', 'BUDGET_BASELINE', 'CURRENT_FORECAST', 'KNOWN_COMMITMENTS', 'RECEIVABLES', 'RECURRING_PATTERNS', 'OPERATIONAL_DRIVERS', 'MANUAL_ASSUMPTIONS');

-- CreateEnum
CREATE TYPE "FinanceProjectionReasonDimension" AS ENUM ('DATA_SUFFICIENCY', 'CONFIDENCE', 'GENERATION');

-- CreateEnum
CREATE TYPE "FinanceProjectionAdoptionScope" AS ENUM ('WHOLE_FINANCE_YEAR', 'SELECTED_ACCOUNTS');

-- CreateTable
CREATE TABLE "FinanceProjection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "financeYearId" TEXT NOT NULL,
    "currentProjectionVersionId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceProjection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceProjectionVersion" (
    "id" TEXT NOT NULL,
    "financeProjectionId" TEXT NOT NULL,
    "status" "FinanceForecastVersionStatus" NOT NULL DEFAULT 'CURRENT',
    "versionNumber" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "actualsThroughDate" DATE NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedByUserId" TEXT,
    "generationActorType" "FinanceProjectionGenerationActorType" NOT NULL DEFAULT 'USER',
    "methodologyFamily" "FinanceProjectionMethodologyFamily" NOT NULL,
    "engineVersion" TEXT NOT NULL,
    "dataSufficiency" "FinanceProjectionDataSufficiency" NOT NULL,
    "confidence" "FinanceProjectionConfidence" NOT NULL,
    "evidenceFingerprint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceProjectionVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceProjectionLine" (
    "id" TEXT NOT NULL,
    "projectionVersionId" TEXT NOT NULL,
    "financialAccountId" TEXT NOT NULL,
    "projectedAmountMinor" INTEGER,
    "lowerBoundMinor" INTEGER,
    "upperBoundMinor" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceProjectionLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceProjectionEvidence" (
    "id" TEXT NOT NULL,
    "projectionVersionId" TEXT NOT NULL,
    "kind" "FinanceProjectionEvidenceKind" NOT NULL,
    "financeYearId" TEXT,
    "financialAccountId" TEXT,
    "observationsCount" INTEGER,
    "fromDate" DATE,
    "throughDate" DATE,
    "sourceReference" TEXT,
    "fingerprint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceProjectionEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceProjectionReasonCode" (
    "id" TEXT NOT NULL,
    "projectionVersionId" TEXT NOT NULL,
    "dimension" "FinanceProjectionReasonDimension" NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceProjectionReasonCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceProjectionAdoption" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "financeProjectionId" TEXT NOT NULL,
    "projectionVersionId" TEXT NOT NULL,
    "sourceForecastVersionId" TEXT,
    "targetForecastVersionId" TEXT NOT NULL,
    "applyScope" "FinanceProjectionAdoptionScope" NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedByUserId" TEXT NOT NULL,

    CONSTRAINT "FinanceProjectionAdoption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinanceProjection_currentProjectionVersionId_key" ON "FinanceProjection"("currentProjectionVersionId");

-- CreateIndex
CREATE INDEX "FinanceProjection_tenantId_idx" ON "FinanceProjection"("tenantId");

-- CreateIndex
CREATE INDEX "FinanceProjection_financeYearId_idx" ON "FinanceProjection"("financeYearId");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceProjection_tenantId_financeYearId_key" ON "FinanceProjection"("tenantId", "financeYearId");

-- CreateIndex
CREATE INDEX "FinanceProjectionVersion_financeProjectionId_status_idx" ON "FinanceProjectionVersion"("financeProjectionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceProjectionVersion_financeProjectionId_versionNumber_key" ON "FinanceProjectionVersion"("financeProjectionId", "versionNumber");

-- CreateIndex
CREATE INDEX "FinanceProjectionLine_financialAccountId_idx" ON "FinanceProjectionLine"("financialAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceProjectionLine_projectionVersionId_financialAccountId_key" ON "FinanceProjectionLine"("projectionVersionId", "financialAccountId");

-- CreateIndex
CREATE INDEX "FinanceProjectionEvidence_projectionVersionId_kind_idx" ON "FinanceProjectionEvidence"("projectionVersionId", "kind");

-- CreateIndex
CREATE INDEX "FinanceProjectionEvidence_financeYearId_idx" ON "FinanceProjectionEvidence"("financeYearId");

-- CreateIndex
CREATE INDEX "FinanceProjectionEvidence_financialAccountId_idx" ON "FinanceProjectionEvidence"("financialAccountId");

-- CreateIndex
CREATE INDEX "FinanceProjectionReasonCode_projectionVersionId_dimension_idx" ON "FinanceProjectionReasonCode"("projectionVersionId", "dimension");

-- CreateIndex
CREATE INDEX "FinanceProjectionAdoption_tenantId_appliedAt_idx" ON "FinanceProjectionAdoption"("tenantId", "appliedAt");

-- CreateIndex
CREATE INDEX "FinanceProjectionAdoption_projectionVersionId_idx" ON "FinanceProjectionAdoption"("projectionVersionId");

-- CreateIndex
CREATE INDEX "FinanceProjectionAdoption_targetForecastVersionId_idx" ON "FinanceProjectionAdoption"("targetForecastVersionId");

-- AddForeignKey
ALTER TABLE "FinanceProjection" ADD CONSTRAINT "FinanceProjection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceProjection" ADD CONSTRAINT "FinanceProjection_financeYearId_fkey" FOREIGN KEY ("financeYearId") REFERENCES "FinanceYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceProjection" ADD CONSTRAINT "FinanceProjection_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceProjection" ADD CONSTRAINT "FinanceProjection_currentProjectionVersionId_fkey" FOREIGN KEY ("currentProjectionVersionId") REFERENCES "FinanceProjectionVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceProjectionVersion" ADD CONSTRAINT "FinanceProjectionVersion_financeProjectionId_fkey" FOREIGN KEY ("financeProjectionId") REFERENCES "FinanceProjection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceProjectionVersion" ADD CONSTRAINT "FinanceProjectionVersion_generatedByUserId_fkey" FOREIGN KEY ("generatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceProjectionLine" ADD CONSTRAINT "FinanceProjectionLine_projectionVersionId_fkey" FOREIGN KEY ("projectionVersionId") REFERENCES "FinanceProjectionVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceProjectionLine" ADD CONSTRAINT "FinanceProjectionLine_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceProjectionEvidence" ADD CONSTRAINT "FinanceProjectionEvidence_projectionVersionId_fkey" FOREIGN KEY ("projectionVersionId") REFERENCES "FinanceProjectionVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceProjectionEvidence" ADD CONSTRAINT "FinanceProjectionEvidence_financeYearId_fkey" FOREIGN KEY ("financeYearId") REFERENCES "FinanceYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceProjectionEvidence" ADD CONSTRAINT "FinanceProjectionEvidence_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "FinancialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceProjectionReasonCode" ADD CONSTRAINT "FinanceProjectionReasonCode_projectionVersionId_fkey" FOREIGN KEY ("projectionVersionId") REFERENCES "FinanceProjectionVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceProjectionAdoption" ADD CONSTRAINT "FinanceProjectionAdoption_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceProjectionAdoption" ADD CONSTRAINT "FinanceProjectionAdoption_financeProjectionId_fkey" FOREIGN KEY ("financeProjectionId") REFERENCES "FinanceProjection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceProjectionAdoption" ADD CONSTRAINT "FinanceProjectionAdoption_projectionVersionId_fkey" FOREIGN KEY ("projectionVersionId") REFERENCES "FinanceProjectionVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceProjectionAdoption" ADD CONSTRAINT "FinanceProjectionAdoption_appliedByUserId_fkey" FOREIGN KEY ("appliedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Range integrity: optional bounds must bracket projected amount when present.
ALTER TABLE "FinanceProjectionLine" ADD CONSTRAINT "FinanceProjectionLine_range_integrity_check" CHECK (
    (
        "lowerBoundMinor" IS NULL
        AND "upperBoundMinor" IS NULL
    )
    OR (
        "projectedAmountMinor" IS NOT NULL
        AND "lowerBoundMinor" IS NOT NULL
        AND "upperBoundMinor" IS NOT NULL
        AND "lowerBoundMinor" <= "projectedAmountMinor"
        AND "projectedAmountMinor" <= "upperBoundMinor"
    )
);
