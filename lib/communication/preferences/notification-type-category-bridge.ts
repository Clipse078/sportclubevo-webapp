import type { NotificationType } from "@prisma/client";
import type { CommunicationPreferenceCategory } from "@/lib/communication/platform/preference-categories";

export function communicationPreferenceCategoryForNotificationType(
  type: NotificationType,
): CommunicationPreferenceCategory | null {
  if (type.startsWith("TEAM_")) {
    return "TEAM_OPERATIONAL";
  }
  if (type === "CLUB_ALERT_PUBLISHED") {
    return "CLUB_OPERATIONAL";
  }
  if (
    type === "CLUB_ANNOUNCEMENT_PUBLISHED" ||
    type === "CLUB_COMMUNICATION_PUBLISHED" ||
    type === "CLUB_CAMPAIGN_PUBLISHED"
  ) {
    return "CLUB_INFORMATION";
  }
  return null;
}
