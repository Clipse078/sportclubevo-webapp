-- MATCH_SQUAD_PLAYER_AVAILABILITY-01D R1 — target trainer-team release awareness (SCE notifications)

ALTER TYPE "NotificationCategory" ADD VALUE 'MATCH_SQUAD';

ALTER TYPE "NotificationType" ADD VALUE 'PLAYER_RELEASE_TARGETED';

ALTER TYPE "NotificationEntityType" ADD VALUE 'PLAYER_RELEASE';
