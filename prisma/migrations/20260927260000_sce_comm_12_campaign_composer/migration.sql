-- SCE-COMM-12 — Campaign composer (additive; builds on COMM-11 PlatformCommunication)

ALTER TYPE "PlatformCommunicationStatus" ADD VALUE IF NOT EXISTS 'READY';

ALTER TABLE "PlatformCommunication"
  ADD COLUMN IF NOT EXISTS "internalName" TEXT;

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CLUB_CAMPAIGN_PUBLISHED';

CREATE INDEX IF NOT EXISTS "PlatformCommunication_tenantId_kind_status_idx"
  ON "PlatformCommunication"("tenantId", "kind", "status");
