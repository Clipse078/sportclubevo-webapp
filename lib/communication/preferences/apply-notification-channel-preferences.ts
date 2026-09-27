import type { NotificationType } from "@prisma/client";
import type { NotificationChannelDefaults } from "@/lib/notifications/defaults";
import { communicationPreferenceCategoryForNotificationType } from "@/lib/communication/preferences/notification-type-category-bridge";
import { evaluateCommunicationDeliveryPreferenceForUser } from "@/lib/communication/preferences/delivery-preference-resolver";

export async function applyCommunicationPreferencesToNotificationDefaults(input: {
  tenantId: string;
  recipientUserId: string;
  notificationType: NotificationType;
  base: NotificationChannelDefaults;
}): Promise<NotificationChannelDefaults> {
  const category = communicationPreferenceCategoryForNotificationType(input.notificationType);
  if (!category) {
    return input.base;
  }

  const [inApp, push, email] = await Promise.all([
    evaluateCommunicationDeliveryPreferenceForUser({
      tenantId: input.tenantId,
      userId: input.recipientUserId,
      category,
      channel: "IN_APP",
    }),
    evaluateCommunicationDeliveryPreferenceForUser({
      tenantId: input.tenantId,
      userId: input.recipientUserId,
      category,
      channel: "PUSH",
    }),
    evaluateCommunicationDeliveryPreferenceForUser({
      tenantId: input.tenantId,
      userId: input.recipientUserId,
      category,
      channel: "EMAIL",
    }),
  ]);

  return {
    inAppEnabled: input.base.inAppEnabled && inApp.allowed,
    emailEnabled: input.base.emailEnabled && email.allowed,
    pushEnabled: input.base.pushEnabled && push.allowed,
  };
}
