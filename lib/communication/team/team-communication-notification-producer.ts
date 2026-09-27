import type { PlatformCommunicationKind, Prisma } from "@prisma/client";
import { NotificationEntityType } from "@prisma/client";
import { createNotificationIdempotent } from "@/lib/notifications/notification-service";
import { resolveEffectivePreference } from "@/lib/notifications/defaults";
import { applyCommunicationPreferencesToNotificationDefaults } from "@/lib/communication/preferences/apply-notification-channel-preferences";
import {
  defaultNotificationTitleForKind,
  notificationTypeForCommunicationKind,
} from "@/lib/communication/team/team-communication-notification-kinds";

export async function emitTeamCommunicationPublishedNotifications(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string;
    communicationId: string;
    teamId: string;
    kind: PlatformCommunicationKind;
    title: string;
    bodyPreview: string;
    deliveryUserIds: readonly string[];
    excludeUserIds?: readonly string[];
  },
): Promise<void> {
  const href = `/dashboard/teams/${input.teamId}/kommunikation?communicationId=${input.communicationId}`;
  const notificationType = notificationTypeForCommunicationKind(input.kind);
  const basePreferences = resolveEffectivePreference(notificationType, null);
  const excluded = new Set((input.excludeUserIds ?? []).filter(Boolean));
  const title = defaultNotificationTitleForKind(input.kind, input.title);

  for (const recipientUserId of [...new Set(input.deliveryUserIds)]) {
    if (!recipientUserId.trim()) continue;
    if (excluded.has(recipientUserId)) continue;
    const preferences = await applyCommunicationPreferencesToNotificationDefaults({
      tenantId: input.tenantId,
      recipientUserId,
      notificationType,
      base: basePreferences,
    });
    await createNotificationIdempotent(tx, {
      tenantId: input.tenantId,
      recipientUserId,
      type: notificationType,
      title,
      body: input.bodyPreview,
      href,
      entityType: NotificationEntityType.COMMUNICATION,
      entityId: input.communicationId,
      deduplicationKey: `team-comm:${input.kind}:${input.communicationId}:${recipientUserId}`,
      preferences,
    });
  }
}
