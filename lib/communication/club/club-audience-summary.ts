/**
 * Compact audience summaries for club communication lists (no recipient PII).
 */

import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";

export function summarizeClubAudienceSpec(audience: CommunicationAudienceSpec): string {
  const parts: string[] = [];
  for (const component of audience.components) {
    if (component.structural?.wholeOrganisation) {
      parts.push("Ganzer Verein");
      continue;
    }
    if ((component.savedTargetGroupIds?.length ?? 0) > 0) {
      const count = component.savedTargetGroupIds!.length;
      parts.push(count === 1 ? "1 Zielgruppe" : `${count} Zielgruppen`);
    }
    if ((component.structural?.orgUnitIds?.length ?? 0) > 0) {
      parts.push(`${component.structural!.orgUnitIds!.length} Org-Einheit(en)`);
    }
    if ((component.structural?.teamIds?.length ?? 0) > 0) {
      parts.push(`${component.structural!.teamIds!.length} Team(s)`);
    }
    if ((component.structural?.roleIds?.length ?? 0) > 0) {
      parts.push(`${component.structural!.roleIds!.length} Rolle(n)`);
    }
    if ((component.structural?.roleKeys?.length ?? 0) > 0) {
      parts.push(`${component.structural!.roleKeys!.length} Rollen-Schlüssel`);
    }
    if ((component.explicit?.includePersonIds?.length ?? 0) > 0) {
      parts.push(`${component.explicit!.includePersonIds!.length} Person(en)`);
    }
    if (component.sponsor?.allActiveSponsors) {
      parts.push("Alle aktiven Sponsoren");
    } else if (component.sponsor) {
      if ((component.sponsor.sponsorOrganisationIds?.length ?? 0) > 0) {
        parts.push(`${component.sponsor.sponsorOrganisationIds!.length} Sponsor-Organisation(en)`);
      }
      if ((component.sponsor.sponsorContactIds?.length ?? 0) > 0) {
        parts.push(`${component.sponsor.sponsorContactIds!.length} Sponsor-Kontakt(e)`);
      }
      if ((component.sponsor.sponsorCategoryIds?.length ?? 0) > 0) {
        parts.push(`${component.sponsor.sponsorCategoryIds!.length} Sponsor-Kategorie(n)`);
      }
    }
  }
  if (parts.length === 0) return "Zielgruppe";
  if (audience.composition === "INTERSECTION") {
    return `${parts.join(" ∩ ")}`;
  }
  return parts.join(" + ");
}
