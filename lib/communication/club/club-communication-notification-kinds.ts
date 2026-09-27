import type { NotificationType, PlatformCommunicationKind } from "@prisma/client";

export function clubNotificationTypeForCommunicationKind(
  kind: PlatformCommunicationKind,
): NotificationType {
  switch (kind) {
    case "ANNOUNCEMENT":
      return "CLUB_ANNOUNCEMENT_PUBLISHED";
    case "ALERT":
      return "CLUB_ALERT_PUBLISHED";
    case "CAMPAIGN":
      return "CLUB_CAMPAIGN_PUBLISHED";
    default:
      return "CLUB_COMMUNICATION_PUBLISHED";
  }
}

export function defaultClubNotificationTitleForKind(
  kind: PlatformCommunicationKind,
  subject: string | null | undefined,
): string {
  const trimmed = subject?.trim();
  if (trimmed) return trimmed;
  switch (kind) {
    case "ANNOUNCEMENT":
      return "Vereins-Mitteilung";
    case "ALERT":
      return "Vereins-Alarm";
    default:
      return "Vereins-Nachricht";
  }
}
