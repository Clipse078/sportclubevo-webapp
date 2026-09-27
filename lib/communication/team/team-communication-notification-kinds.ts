import type { NotificationType, PlatformCommunicationKind } from "@prisma/client";

export function notificationTypeForCommunicationKind(
  kind: PlatformCommunicationKind,
): NotificationType {
  switch (kind) {
    case "ANNOUNCEMENT":
      return "TEAM_ANNOUNCEMENT_PUBLISHED";
    case "ALERT":
      return "TEAM_ALERT_PUBLISHED";
    case "POLL":
      return "TEAM_POLL_PUBLISHED";
    case "DATE_POLL":
      return "TEAM_DATE_POLL_PUBLISHED";
    case "REQUEST":
      return "TEAM_REQUEST_PUBLISHED";
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
    case "POLL":
      return "Team-Umfrage";
    case "DATE_POLL":
      return "Team-Terminumfrage";
    case "REQUEST":
      return "Team-Anfrage";
    default:
      return "Team-Nachricht";
  }
}
