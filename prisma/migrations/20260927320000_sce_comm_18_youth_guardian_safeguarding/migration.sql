-- SCE-COMM-18 — Youth / guardian communication safeguarding

CREATE TABLE "TenantCommunicationSafeguardingPolicy" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "safeguardingEnabled" BOOLEAN NOT NULL DEFAULT true,
  "minorAgeThresholdYears" INTEGER NOT NULL DEFAULT 18,
  "allowDirectMinorDelivery" BOOLEAN NOT NULL DEFAULT false,
  "guardianVisibilityRequired" BOOLEAN NOT NULL DEFAULT true,
  "guardianOnlyDeliveryRequired" BOOLEAN NOT NULL DEFAULT true,
  "guardianResponseAuthorityEnabled" BOOLEAN NOT NULL DEFAULT true,
  "deliverToAllActiveGuardians" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TenantCommunicationSafeguardingPolicy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantCommunicationSafeguardingPolicy_tenantId_key" ON "TenantCommunicationSafeguardingPolicy"("tenantId");

ALTER TABLE "TenantCommunicationSafeguardingPolicy"
  ADD CONSTRAINT "TenantCommunicationSafeguardingPolicy_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlatformCommunicationRecipientSnapshot"
  ADD COLUMN "safeguardingReasonCode" TEXT,
  ADD COLUMN "subjectMinorAtDispatch" BOOLEAN,
  ADD COLUMN "guardianPersonId" TEXT;

ALTER TABLE "PlatformCommunicationPollResponse"
  ADD COLUMN "actorUserId" TEXT;
