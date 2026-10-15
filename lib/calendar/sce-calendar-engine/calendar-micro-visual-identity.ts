import type { ClubIdentity } from "@/lib/sporting-activity-design/club-identity";
import { resolveClubIdentityEffectiveLogoUrl } from "@/lib/sporting-activity-design/club-identity";

export type CalendarMicroVisualIdentity = {
  kind: "CLUB_CREST";
  identity: ClubIdentity;
};

export function calendarMicroVisualIdentityFromClub(
  identity: ClubIdentity | undefined | null,
): CalendarMicroVisualIdentity | undefined {
  if (!identity) return undefined;
  if (!resolveClubIdentityEffectiveLogoUrl(identity)) return undefined;
  return { kind: "CLUB_CREST", identity };
}
