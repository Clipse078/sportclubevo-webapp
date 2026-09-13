-- BILLING-AUTO-01 — recurring billing run history + contract period idempotency

-- CreateEnum
CREATE TYPE "BillingRecurringRunMode" AS ENUM ('DRY_RUN', 'EXECUTE');
CREATE TYPE "BillingRecurringRunTrigger" AS ENUM ('CRON', 'MANUAL');
CREATE TYPE "BillingRecurringRunStatus" AS ENUM ('COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "BillingRecurringRun" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "mode" "BillingRecurringRunMode" NOT NULL,
    "trigger" "BillingRecurringRunTrigger" NOT NULL,
    "status" "BillingRecurringRunStatus" NOT NULL,
    "asOfDate" DATE NOT NULL,
    "deliverAutomatically" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "summaryJson" JSONB NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingRecurringRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BillingRecurringRun_key_key" ON "BillingRecurringRun"("key");
CREATE INDEX "BillingRecurringRun_startedAt_idx" ON "BillingRecurringRun"("startedAt");
CREATE INDEX "BillingRecurringRun_trigger_startedAt_idx" ON "BillingRecurringRun"("trigger", "startedAt");

CREATE INDEX "Invoice_billingContractId_periodStart_periodEnd_idx"
ON "Invoice"("billingContractId", "periodStart", "periodEnd");

-- One non-VOID invoice per contract service period (VOID allows re-billing).
CREATE UNIQUE INDEX "Invoice_billingContractId_period_active_unique"
ON "Invoice"("billingContractId", "periodStart", "periodEnd")
WHERE "billingContractId" IS NOT NULL AND "status" <> 'VOID';
