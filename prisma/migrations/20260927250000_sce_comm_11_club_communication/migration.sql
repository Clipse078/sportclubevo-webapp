-- SCE-COMM-11 — Club (organisation-level) communication foundation (additive)

ALTER TYPE "PlatformCommunicationContextKind" ADD VALUE IF NOT EXISTS 'ORGANISATION';
ALTER TYPE "PlatformCommunicationContextKind" ADD VALUE IF NOT EXISTS 'ORG_UNIT';

ALTER TYPE "PlatformCommunicationConversationKind" ADD VALUE IF NOT EXISTS 'ORG_GENERAL';

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CLUB_COMMUNICATION_PUBLISHED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CLUB_ANNOUNCEMENT_PUBLISHED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CLUB_ALERT_PUBLISHED';

INSERT INTO "Permission" ("id", "key", "name", "module", "scope", "grantableByAdmin", "createdAt", "updatedAt")
VALUES
  (
    gen_random_uuid()::text,
    'communication.club.view',
    'View club communication',
    'COMMUNICATION',
    'TENANT',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid()::text,
    'communication.club.send',
    'Send club communication',
    'COMMUNICATION',
    'TENANT',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid()::text,
    'communication.club.engagement_detail',
    'View club communication recipient engagement detail',
    'COMMUNICATION',
    'TENANT',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("key") DO UPDATE SET
  "name" = EXCLUDED."name",
  "module" = EXCLUDED."module",
  "scope" = EXCLUDED."scope",
  "grantableByAdmin" = EXCLUDED."grantableByAdmin",
  "updatedAt" = CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "PlatformCommunicationConversation_tenantId_contextKind_idx"
  ON "PlatformCommunicationConversation"("tenantId", "contextKind");
