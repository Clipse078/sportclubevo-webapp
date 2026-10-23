-- CreateEnum
CREATE TYPE "FinanceForecastVersionStatus" AS ENUM ('CURRENT', 'SUPERSEDED');

-- CreateTable
CREATE TABLE "FinanceForecast" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "financeYearId" TEXT NOT NULL,
    "currentVersionId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceForecast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceForecastVersion" (
    "id" TEXT NOT NULL,
    "forecastId" TEXT NOT NULL,
    "status" "FinanceForecastVersionStatus" NOT NULL DEFAULT 'CURRENT',
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "scenarioKey" TEXT,
    "note" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceForecastVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceForecastLine" (
    "id" TEXT NOT NULL,
    "forecastVersionId" TEXT NOT NULL,
    "financialAccountId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceForecastLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinanceForecast_currentVersionId_key" ON "FinanceForecast"("currentVersionId");

-- CreateIndex
CREATE INDEX "FinanceForecast_tenantId_idx" ON "FinanceForecast"("tenantId");

-- CreateIndex
CREATE INDEX "FinanceForecast_financeYearId_idx" ON "FinanceForecast"("financeYearId");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceForecast_tenantId_financeYearId_key" ON "FinanceForecast"("tenantId", "financeYearId");

-- CreateIndex
CREATE INDEX "FinanceForecastVersion_forecastId_status_idx" ON "FinanceForecastVersion"("forecastId", "status");

-- CreateIndex
CREATE INDEX "FinanceForecastVersion_forecastId_versionNumber_idx" ON "FinanceForecastVersion"("forecastId", "versionNumber");

-- CreateIndex
CREATE INDEX "FinanceForecastLine_financialAccountId_idx" ON "FinanceForecastLine"("financialAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceForecastLine_forecastVersionId_financialAccountId_key" ON "FinanceForecastLine"("forecastVersionId", "financialAccountId");

-- AddForeignKey
ALTER TABLE "FinanceForecast" ADD CONSTRAINT "FinanceForecast_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceForecast" ADD CONSTRAINT "FinanceForecast_financeYearId_fkey" FOREIGN KEY ("financeYearId") REFERENCES "FinanceYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceForecast" ADD CONSTRAINT "FinanceForecast_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceForecast" ADD CONSTRAINT "FinanceForecast_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "FinanceForecastVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceForecastVersion" ADD CONSTRAINT "FinanceForecastVersion_forecastId_fkey" FOREIGN KEY ("forecastId") REFERENCES "FinanceForecast"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceForecastVersion" ADD CONSTRAINT "FinanceForecastVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceForecastLine" ADD CONSTRAINT "FinanceForecastLine_forecastVersionId_fkey" FOREIGN KEY ("forecastVersionId") REFERENCES "FinanceForecastVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceForecastLine" ADD CONSTRAINT "FinanceForecastLine_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
