-- SCE-SUPERADMIN-BILLING-01B — Tenant ↔ Stripe customer linkage
--
-- Adds TenantBillingAccount: one optional row per tenant holding stripeCustomerId only.
-- No financial fields. No seed/backfill of customer IDs.

ALTER TYPE "PermissionModule" ADD VALUE IF NOT EXISTS 'BILLING';

CREATE TABLE "TenantBillingAccount" (
    "id"               TEXT         NOT NULL,
    "tenantId"         TEXT         NOT NULL,
    "stripeCustomerId" TEXT         NOT NULL,
    "linkedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "linkedByUserId"   TEXT,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantBillingAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantBillingAccount_tenantId_key" ON "TenantBillingAccount"("tenantId");
CREATE UNIQUE INDEX "TenantBillingAccount_stripeCustomerId_key" ON "TenantBillingAccount"("stripeCustomerId");
CREATE INDEX "TenantBillingAccount_stripeCustomerId_idx" ON "TenantBillingAccount"("stripeCustomerId");

ALTER TABLE "TenantBillingAccount" ADD CONSTRAINT "TenantBillingAccount_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TenantBillingAccount" ADD CONSTRAINT "TenantBillingAccount_linkedByUserId_fkey"
    FOREIGN KEY ("linkedByUserId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
