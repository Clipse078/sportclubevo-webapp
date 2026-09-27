import type { NotificationType } from "@prisma/client";

export function campaignNotificationType(): NotificationType {
  return "CLUB_CAMPAIGN_PUBLISHED";
}

export function defaultCampaignNotificationTitle(
  subject: string | null | undefined,
  internalName: string | null | undefined,
): string {
  const subjectTrimmed = subject?.trim();
  if (subjectTrimmed) return subjectTrimmed;
  const internalTrimmed = internalName?.trim();
  if (internalTrimmed) return internalTrimmed;
  return "Vereinskampagne";
}

export function campaignDeepLinkPath(communicationId: string): string {
  return `/dashboard/communication/kampagnen/${communicationId}`;
}
