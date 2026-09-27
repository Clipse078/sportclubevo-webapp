import type { NotificationType } from "@prisma/client";
import {
  resolveEffectivePreference,
  type NotificationChannelDefaults,
} from "@/lib/notifications/defaults";
import { isNotificationTypePushEligible } from "@/lib/push/push-eligibility";

/**
 * COMM-17 will extend stored preferences; COMM-09 evaluates Push only for eligible types.
 */
export function evaluatePushEnabledForNotificationType(
  type: NotificationType,
  stored: NotificationChannelDefaults | null,
): boolean {
  if (!isNotificationTypePushEligible(type)) return false;
  const effective = resolveEffectivePreference(type, stored);
  return effective.pushEnabled;
}
