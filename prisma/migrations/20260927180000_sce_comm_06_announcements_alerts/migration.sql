-- SCE-COMM-06 — Team announcements & alerts (additive)

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TEAM_ANNOUNCEMENT_PUBLISHED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TEAM_ALERT_PUBLISHED';

ALTER TABLE "PlatformCommunication"
  ADD COLUMN IF NOT EXISTS "acknowledgementRequired" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "PlatformCommunicationRecipientSnapshot"
  ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "acknowledgedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "pc_recipient_snapshot_tenant_comm_engagement_idx"
  ON "PlatformCommunicationRecipientSnapshot"("tenantId", "communicationId", "engagement");
