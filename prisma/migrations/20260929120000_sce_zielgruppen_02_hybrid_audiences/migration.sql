-- SCE-ZIELGRUPPEN-02 — external communication contacts + snapshot FK

CREATE TYPE "CommunicationExternalContactStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

ALTER TYPE "PlatformCommunicationRecipientKind" ADD VALUE 'EXTERNAL_COMMUNICATION_CONTACT';

CREATE TABLE "CommunicationExternalContact" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "emailNormalized" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "displayName" TEXT,
    "sourceKey" TEXT,
    "sourceMetaJson" JSONB,
    "status" "CommunicationExternalContactStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunicationExternalContact_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PlatformCommunicationRecipientSnapshot"
ADD COLUMN "communicationExternalContactId" TEXT;

CREATE UNIQUE INDEX "cec_tenant_email_uq" ON "CommunicationExternalContact"("tenantId", "emailNormalized");
CREATE INDEX "cec_tenant_status_idx" ON "CommunicationExternalContact"("tenantId", "status");

CREATE INDEX "pc_recipient_snapshot_tenant_comm_ext_idx"
ON "PlatformCommunicationRecipientSnapshot"("tenantId", "communicationExternalContactId");

CREATE UNIQUE INDEX "PlatformCommunicationRecipientSnapshot_communicationId_communicationExternalContactId_key"
ON "PlatformCommunicationRecipientSnapshot"("communicationId", "communicationExternalContactId");

ALTER TABLE "CommunicationExternalContact"
ADD CONSTRAINT "CommunicationExternalContact_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunicationExternalContact"
ADD CONSTRAINT "CommunicationExternalContact_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PlatformCommunicationRecipientSnapshot"
ADD CONSTRAINT "PlatformCommunicationRecipientSnapshot_communicationExternalContactId_fkey"
FOREIGN KEY ("communicationExternalContactId") REFERENCES "CommunicationExternalContact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
