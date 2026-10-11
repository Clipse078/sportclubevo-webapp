/**
 * MATCH_SQUAD_PLAYER_AVAILABILITY-01E — post-commit assignment notifications.
 */

import { NotificationEntityType, NotificationType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { createGuardianExpansionPort } from "@/lib/communication/platform/recipient-resolution/guardian-expansion";
import {
  buildPlayerReleaseAssignmentDedupKey,
} from "@/lib/notifications/deduplication";
import { resolveEffectivePreference } from "@/lib/notifications/defaults";
import { createNotificationIdempotent } from "@/lib/notifications/notification-service";
import { loadEffectivePreferencesForUsers } from "@/lib/notifications/preference-service";
import {
  buildPlayerReleaseAssignmentPlayerCopy,
  buildPlayerReleaseAssignmentSourceTrainerCopy,
  formatPlayerReleaseActivityScheduleLine,
  playerReleaseAssignmentParticipationHref,
  playerReleaseAssignmentAufgebotHref,
} from "@/lib/match-squad/player-release-assignment-copy";
import { resolveTargetTeamTrainerRecipientUserIds } from "@/lib/match-squad/player-release-target-trainer-recipients";

export type EmitPlayerReleaseAssignmentNotificationsInput = {
  tenantId: string;
  matchSquadMemberId: string;
  requestId: string;
  personId: string;
  personDisplayName: string;
  sourceTeamSeasonId: string;
  targetTeamSeasonId: string;
  targetTeamLabel: string;
  targetEventId: string;
  targetEventType: "MATCH" | "TOURNAMENT";
  targetEventTitle: string;
  targetEventStartAt: Date;
  actorUserId: string;
  timezone: string;
};

export async function emitPlayerReleaseAssignmentNotifications(
  input: EmitPlayerReleaseAssignmentNotificationsInput,
): Promise<void> {
  const scheduleLine = formatPlayerReleaseActivityScheduleLine(
    input.targetEventStartAt,
    input.timezone,
  );

  const playerCopy = buildPlayerReleaseAssignmentPlayerCopy({
    targetTeamLabel: input.targetTeamLabel,
    activityScheduleLine: scheduleLine,
    activityTitle: input.targetEventTitle,
    eventType: input.targetEventType,
  });

  const participationHref = playerReleaseAssignmentParticipationHref({
    eventType: input.targetEventType,
    eventId: input.targetEventId,
  });

  const port = createGuardianExpansionPort();
  const playerTargets = await port.expandSubjectsToDeliveryTargets({
    tenantId: input.tenantId,
    subjectPersonIds: [input.personId],
    category: "TEAM_OPERATIONAL",
    channel: "IN_APP",
  });

  const playerRecipientUserIds = new Set<string>();
  for (const target of playerTargets) {
    for (const userId of target.deliveryUserIds) {
      if (userId && userId !== input.actorUserId) {
        playerRecipientUserIds.add(userId);
      }
    }
  }

  const sourceTrainers = await resolveTargetTeamTrainerRecipientUserIds({
    tenantId: input.tenantId,
    targetTeamSeasonId: input.sourceTeamSeasonId,
    excludeUserIds: [input.actorUserId],
  });

  const sourceCopy = buildPlayerReleaseAssignmentSourceTrainerCopy({
    personDisplayName: input.personDisplayName,
    targetTeamLabel: input.targetTeamLabel,
    activityScheduleLine: scheduleLine,
  });

  const sourceHref = playerReleaseAssignmentAufgebotHref({
    eventType: input.targetEventType,
    eventId: input.targetEventId,
  });

  const allRecipientIds = [
    ...playerRecipientUserIds,
    ...sourceTrainers.recipientUserIds,
  ];
  if (allRecipientIds.length === 0) {
    return;
  }

  const prefsByUser = await loadEffectivePreferencesForUsers(
    prisma,
    input.tenantId,
    allRecipientIds,
    NotificationType.PLAYER_RELEASE_ASSIGNED,
  );

  await prisma.$transaction(async (tx) => {
    for (const recipientUserId of playerRecipientUserIds) {
      const preferences = resolveEffectivePreference(
        NotificationType.PLAYER_RELEASE_ASSIGNED,
        prefsByUser.get(recipientUserId) ?? null,
      );
      await createNotificationIdempotent(tx, {
        tenantId: input.tenantId,
        recipientUserId,
        type: NotificationType.PLAYER_RELEASE_ASSIGNED,
        title: playerCopy.title,
        body: playerCopy.body,
        href: participationHref,
        entityType: NotificationEntityType.EVENT,
        entityId: input.targetEventId,
        deduplicationKey: buildPlayerReleaseAssignmentDedupKey({
          matchSquadMemberId: input.matchSquadMemberId,
          recipientUserId,
          purpose: "PLAYER_GUARDIAN",
        }),
        preferences,
      });
    }

    for (const recipientUserId of sourceTrainers.recipientUserIds) {
      const preferences = resolveEffectivePreference(
        NotificationType.PLAYER_RELEASE_ASSIGNED,
        prefsByUser.get(recipientUserId) ?? null,
      );
      await createNotificationIdempotent(tx, {
        tenantId: input.tenantId,
        recipientUserId,
        type: NotificationType.PLAYER_RELEASE_ASSIGNED,
        title: sourceCopy.title,
        body: sourceCopy.body,
        href: sourceHref,
        entityType: NotificationEntityType.PLAYER_RELEASE,
        entityId: input.requestId,
        deduplicationKey: buildPlayerReleaseAssignmentDedupKey({
          matchSquadMemberId: input.matchSquadMemberId,
          recipientUserId,
          purpose: "SOURCE_TRAINER",
        }),
        preferences,
      });
    }
  });
}
