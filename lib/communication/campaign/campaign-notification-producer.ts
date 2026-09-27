import type { Prisma } from "@prisma/client";
import { NotificationEntityType } from "@prisma/client";
import { createNotificationIdempotent } from "@/lib/notifications/notification-service";
import { resolveEffectivePreference } from "@/lib/notifications/defaults";
import { applyCommunicationPreferencesToNotificationDefaults } from "@/lib/communication/preferences/apply-notification-channel-preferences";
import {
  campaignDeepLinkPath,
  campaignNotificationType,
  defaultCampaignNotificationTitle,
} from "@/lib/communication/campaign/campaign-notification-kinds";

export async function emitCampaignPublishedNotifications(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string;
    communicationId: string;
    subject: string | null;
    internalName: string | null;
    bodyPreview: string;
    deliveryUserIds: readonly string[];
    excludeUserIds?: readonly string[];
  },
): Promise<void> {
  const href = campaignDeepLinkPath(input.communicationId);
  const notificationType = campaignNotificationType();
  const basePreferences = resolveEffectivePreference(notificationType, null);
  const excluded = new Set((input.excludeUserIds ?? []).filter(Boolean));
  const title = defaultCampaignNotificationTitle(input.subject, input.internalName);

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
      deduplicationKey: `campaign:CAMPAIGN:${input.communicationId}:${recipientUserId}`,
      preferences,
    });
  }
}
