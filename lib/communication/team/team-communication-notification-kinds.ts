import type { NotificationType, PlatformCommunicationKind } from "@prisma/client";

export function notificationTypeForCommunicationKind(
  kind: PlatformCommunicationKind,
): NotificationType {
  switch (kind) {
    case "ANNOUNCEMENT":
      return "TEAM_ANNOUNCEMENT_PUBLISHED";
    case "ALERT":
      return "TEAM_ALERT_PUBLISHED";
    default:
      return "TEAM_COMMUNICATION_PUBLISHED";
  }
}

export function defaultNotificationTitleForKind(
  kind: PlatformCommunicationKind,
  subject: string | null | undefined,
): string {
  const trimmed = subject?.trim();
  if (trimmed) return trimmed;
  switch (kind) {
    case "ANNOUNCEMENT":
      return "Team-Mitteilung";
    case "ALERT":
      return "Team-Alarm";
    default:
      return "Team-Nachricht";
  }
}
