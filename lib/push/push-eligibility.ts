import type { NotificationType } from "@prisma/client";

/** Canonical mapping of notification types eligible for Push in COMM-09. */
export const PUSH_ELIGIBLE_NOTIFICATION_TYPES = new Set<NotificationType>([
  "TEAM_COMMUNICATION_PUBLISHED",
  "TEAM_ANNOUNCEMENT_PUBLISHED",
  "TEAM_ALERT_PUBLISHED",
  "TEAM_POLL_PUBLISHED",
  "TEAM_DATE_POLL_PUBLISHED",
  "TEAM_REQUEST_PUBLISHED",
]);

export function isNotificationTypePushEligible(type: NotificationType): boolean {
  return PUSH_ELIGIBLE_NOTIFICATION_TYPES.has(type);
}
