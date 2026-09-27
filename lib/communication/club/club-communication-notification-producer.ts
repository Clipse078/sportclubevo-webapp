import type { PlatformCommunicationKind, Prisma } from "@prisma/client";
import { NotificationEntityType } from "@prisma/client";
import { createNotificationIdempotent } from "@/lib/notifications/notification-service";
import { resolveEffectivePreference } from "@/lib/notifications/defaults";
import {
  clubNotificationTypeForCommunicationKind,
  defaultClubNotificationTitleForKind,
} from "@/lib/communication/club/club-communication-notification-kinds";

export async function emitClubCommunicationPublishedNotifications(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string;
    communicationId: string;
    kind: PlatformCommunicationKind;
    title: string;
    bodyPreview: string;
    deliveryUserIds: readonly string[];
    excludeUserIds?: readonly string[];
  },
): Promise<void> {
  const href = `/dashboard/communication/mitteilungen/${input.communicationId}`;
  const notificationType = clubNotificationTypeForCommunicationKind(input.kind);
  const preferences = resolveEffectivePreference(notificationType, null);
  const excluded = new Set((input.excludeUserIds ?? []).filter(Boolean));
  const title = defaultClubNotificationTitleForKind(input.kind, input.title);

  for (const recipientUserId of [...new Set(input.deliveryUserIds)]) {
    if (!recipientUserId.trim()) continue;
    if (excluded.has(recipientUserId)) continue;
    await createNotificationIdempotent(tx, {
      tenantId: input.tenantId,
      recipientUserId,
      type: notificationType,
      title,
      body: input.bodyPreview,
      href,
      entityType: NotificationEntityType.COMMUNICATION,
      entityId: input.communicationId,
      deduplicationKey: `club-comm:${input.kind}:${input.communicationId}:${recipientUserId}`,
      preferences,
    });
  }
}
