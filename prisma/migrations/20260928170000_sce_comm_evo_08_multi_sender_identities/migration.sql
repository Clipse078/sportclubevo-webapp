-- SCE-COMM-EVO-08 — multi-sender Communication identities (additive).

CREATE TYPE "TenantCommunicationSenderIdentityStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "PlatformCommunicationEmailSenderSource" AS ENUM ('TENANT', 'PLATFORM');

CREATE TABLE "TenantCommunicationSenderIdentity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "emailAddress" TEXT NOT NULL,
    "status" "TenantCommunicationSenderIdentityStatus" NOT NULL DEFAULT 'ACTIVE',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "scopeKind" TEXT NOT NULL DEFAULT 'TENANT_WIDE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantCommunicationSenderIdentity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tcsi_tenant_email_uq" ON "TenantCommunicationSenderIdentity"("tenantId", "emailAddress");
CREATE INDEX "tcsi_tenant_status_idx" ON "TenantCommunicationSenderIdentity"("tenantId", "status");
CREATE INDEX "tcsi_tenant_default_idx" ON "TenantCommunicationSenderIdentity"("tenantId", "isDefault");
CREATE UNIQUE INDEX "tcsi_one_default_active_per_tenant_idx"
  ON "TenantCommunicationSenderIdentity"("tenantId")
  WHERE "isDefault" = true AND "status" = 'ACTIVE';

ALTER TABLE "TenantCommunicationSenderIdentity"
  ADD CONSTRAINT "TenantCommunicationSenderIdentity_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlatformCommunication"
  ADD COLUMN "emailSenderIdentityId" TEXT,
  ADD COLUMN "emailSenderDisplayNameSnapshot" TEXT,
  ADD COLUMN "emailSenderAddressSnapshot" TEXT,
  ADD COLUMN "emailSenderSource" "PlatformCommunicationEmailSenderSource";

CREATE INDEX "PlatformCommunication_tenantId_emailSenderIdentityId_idx"
  ON "PlatformCommunication"("tenantId", "emailSenderIdentityId");

-- Legacy tenant sender fields → canonical default identity (one row per configured tenant).
INSERT INTO "TenantCommunicationSenderIdentity" (
  "id",
  "tenantId",
  "displayName",
  "emailAddress",
  "status",
  "isDefault",
  "scopeKind",
  "createdAt",
  "updatedAt"
)
SELECT
  'tcsi_legacy_' || t."id",
  t."id",
  trim(t."emailSenderDisplayName"),
  lower(trim(t."emailSenderAddress")),
  'ACTIVE'::"TenantCommunicationSenderIdentityStatus",
  true,
  'TENANT_WIDE',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Tenant" t
WHERE t."emailSenderDisplayName" IS NOT NULL
  AND trim(t."emailSenderDisplayName") <> ''
  AND t."emailSenderAddress" IS NOT NULL
  AND trim(t."emailSenderAddress") <> ''
ON CONFLICT ("tenantId", "emailAddress") DO NOTHING;
