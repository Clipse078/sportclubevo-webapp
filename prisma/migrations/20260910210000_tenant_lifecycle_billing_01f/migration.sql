-- SCE-SUPERADMIN-BILLING-01F: Tenant commercial lifecycle (SUSPENDED / TERMINATED)

-- CreateEnum
CREATE TYPE "TenantSuspensionReason" AS ENUM ('NON_PAYMENT', 'ADMINISTRATIVE', 'OTHER');
CREATE TYPE "TenantTerminationReason" AS ENUM ('CONTRACT_ENDED', 'CUSTOMER_REQUEST', 'ADMINISTRATIVE', 'OTHER');

-- Replace TenantStatus enum (INACTIVE -> SUSPENDED)
CREATE TYPE "TenantStatus_new" AS ENUM ('ACTIVE', 'SUSPENDED', 'TERMINATED', 'ARCHIVED');

ALTER TABLE "Tenant" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Tenant" ALTER COLUMN "status" TYPE "TenantStatus_new" USING (
  CASE "status"::text
    WHEN 'INACTIVE' THEN 'SUSPENDED'::"TenantStatus_new"
    ELSE "status"::text::"TenantStatus_new"
  END
);

DROP TYPE "TenantStatus";
ALTER TYPE "TenantStatus_new" RENAME TO "TenantStatus";
ALTER TABLE "Tenant" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

ALTER TABLE "Tenant" ADD COLUMN "suspendedAt" TIMESTAMP(3);
ALTER TABLE "Tenant" ADD COLUMN "suspendedByUserId" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "suspensionReason" "TenantSuspensionReason";
ALTER TABLE "Tenant" ADD COLUMN "suspensionReasonNote" VARCHAR(500);
ALTER TABLE "Tenant" ADD COLUMN "reactivatedAt" TIMESTAMP(3);
ALTER TABLE "Tenant" ADD COLUMN "reactivatedByUserId" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "terminatedAt" TIMESTAMP(3);
ALTER TABLE "Tenant" ADD COLUMN "terminatedByUserId" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "terminationReason" "TenantTerminationReason";
ALTER TABLE "Tenant" ADD COLUMN "terminationReasonNote" VARCHAR(500);

ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_suspendedByUserId_fkey" FOREIGN KEY ("suspendedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_reactivatedByUserId_fkey" FOREIGN KEY ("reactivatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_terminatedByUserId_fkey" FOREIGN KEY ("terminatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
