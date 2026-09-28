-- SCE-COMM-EVO-07 — rich personal signatures (additive).

ALTER TYPE "CommunicationAttachmentSourceType" ADD VALUE IF NOT EXISTS 'PERSONAL_SIGNATURE';

ALTER TABLE "UserCommunicationPersonalSignature"
  ADD COLUMN IF NOT EXISTS "contentJson" JSONB,
  ADD COLUMN IF NOT EXISTS "contentVersion" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "PlatformCommunication"
  ADD COLUMN IF NOT EXISTS "personalSignatureFreezeJson" JSONB;

ALTER TABLE "PlatformCommunicationRecipientSnapshot"
  ADD COLUMN IF NOT EXISTS "renderedBodyHtml" TEXT;

ALTER TABLE "CommunicationCenterMessage"
  ADD COLUMN IF NOT EXISTS "personalSignatureFreezeJson" JSONB;

CREATE TABLE IF NOT EXISTS "UserCommunicationPersonalSignatureAsset" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "signatureId" TEXT NOT NULL,
    "attachmentId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "altText" TEXT NOT NULL,
    "cidKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserCommunicationPersonalSignatureAsset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "uc_ps_sig_asset_sig_att_uniq"
  ON "UserCommunicationPersonalSignatureAsset"("signatureId", "attachmentId");

CREATE UNIQUE INDEX IF NOT EXISTS "uc_ps_sig_asset_sig_ord_uniq"
  ON "UserCommunicationPersonalSignatureAsset"("signatureId", "sortOrder");

CREATE INDEX IF NOT EXISTS "uc_ps_sig_asset_tenant_sig_idx"
  ON "UserCommunicationPersonalSignatureAsset"("tenantId", "signatureId");

CREATE INDEX IF NOT EXISTS "uc_ps_sig_asset_tenant_att_idx"
  ON "UserCommunicationPersonalSignatureAsset"("tenantId", "attachmentId");

ALTER TABLE "UserCommunicationPersonalSignatureAsset"
  ADD CONSTRAINT "UserCommunicationPersonalSignatureAsset_signatureId_fkey"
  FOREIGN KEY ("signatureId") REFERENCES "UserCommunicationPersonalSignature"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserCommunicationPersonalSignatureAsset"
  ADD CONSTRAINT "UserCommunicationPersonalSignatureAsset_attachmentId_fkey"
  FOREIGN KEY ("attachmentId") REFERENCES "CommunicationAttachment"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
