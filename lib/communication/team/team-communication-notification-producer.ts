import type { Prisma } from "@prisma/client";
import { NotificationEntityType, NotificationType } from "@prisma/client";
import { createNotificationIdempotent } from "@/lib/notifications/notification-service";
import { resolveEffectivePreference } from "@/lib/notifications/defaults";

export async function emitTeamCommunicationPublishedNotifications(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string;
    communicationId: string;
    teamId: string;
    title: string;
    bodyPreview: string;
    deliveryUserIds: readonly string[];
    excludeUserIds?: readonly string[];
  },
): Promise<void> {
  const href = `/dashboard/teams/${input.teamId}/kommunikation?communicationId=${input.communicationId}`;
  const preferences = resolveEffectivePreference(
    NotificationType.TEAM_COMMUNICATION_PUBLISHED,
    null,
  );
  const excluded = new Set((input.excludeUserIds ?? []).filter(Boolean));

  for (const recipientUserId of [...new Set(input.deliveryUserIds)]) {
    if (!recipientUserId.trim()) continue;
    if (excluded.has(recipientUserId)) continue;
    await createNotificationIdempotent(tx, {
      tenantId: input.tenantId,
      recipientUserId,
      type: NotificationType.TEAM_COMMUNICATION_PUBLISHED,
      title: input.title,
      body: input.bodyPreview,
      href,
      entityType: NotificationEntityType.COMMUNICATION,
      entityId: input.communicationId,
      deduplicationKey: `team-comm:${input.communicationId}:${recipientUserId}`,
      preferences,
    });
  }
}
