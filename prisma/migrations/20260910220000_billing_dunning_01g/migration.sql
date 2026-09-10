-- SCE-SUPERADMIN-BILLING-01G: Dunning, grace periods, webhook idempotency

CREATE TYPE "TenantLifecycleActionSource" AS ENUM ('MANUAL', 'DUNNING_AUTOMATION', 'SYSTEM');
CREATE TYPE "BillingDunningStatus" AS ENUM (
  'CURRENT',
  'GRACE_PERIOD',
  'SUSPENDED',
  'RESOLVED',
  'EXEMPT',
  'REQUIRES_REVIEW'
);

ALTER TABLE "Tenant" ADD COLUMN "suspensionActionSource" "TenantLifecycleActionSource";

ALTER TABLE "TenantBillingAccount" ADD COLUMN "dunningStatus" "BillingDunningStatus" NOT NULL DEFAULT 'CURRENT';
ALTER TABLE "TenantBillingAccount" ADD COLUMN "firstPaymentFailureAt" TIMESTAMP(3);
ALTER TABLE "TenantBillingAccount" ADD COLUMN "latestPaymentFailureAt" TIMESTAMP(3);
ALTER TABLE "TenantBillingAccount" ADD COLUMN "gracePeriodEndsAt" TIMESTAMP(3);
ALTER TABLE "TenantBillingAccount" ADD COLUMN "automaticallySuspendedAt" TIMESTAMP(3);
ALTER TABLE "TenantBillingAccount" ADD COLUMN "resolvedAt" TIMESTAMP(3);
ALTER TABLE "TenantBillingAccount" ADD COLUMN "lastDunningEventAt" TIMESTAMP(3);
ALTER TABLE "TenantBillingAccount" ADD COLUMN "dunningExemptUntil" TIMESTAMP(3);
ALTER TABLE "TenantBillingAccount" ADD COLUMN "dunningExemptNote" VARCHAR(500);
ALTER TABLE "TenantBillingAccount" ADD COLUMN "automaticDunningEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "TenantBillingAccount" ADD COLUMN "lastStripeEventId" TEXT;

CREATE INDEX "TenantBillingAccount_dunningStatus_gracePeriodEndsAt_idx"
  ON "TenantBillingAccount"("dunningStatus", "gracePeriodEndsAt");

CREATE TABLE "StripeWebhookProcessedEvent" (
  "id" TEXT NOT NULL,
  "stripeEventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StripeWebhookProcessedEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StripeWebhookProcessedEvent_stripeEventId_key"
  ON "StripeWebhookProcessedEvent"("stripeEventId");
CREATE INDEX "StripeWebhookProcessedEvent_processedAt_idx"
  ON "StripeWebhookProcessedEvent"("processedAt");
