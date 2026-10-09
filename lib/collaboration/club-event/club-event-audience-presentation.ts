/**
 * SCE-COLLAB-01C — human-readable club event participation audience labels (server/API).
 */

import type { ClubEventAudienceEntryDto } from "@/lib/events/club-event-participation-audience-service";

export type ClubEventCommunicationScope = "TEAM" | "CLUB";

export const CLUB_EVENT_NO_AUDIENCE_LABEL_DE = "Keine Zielgruppe festgelegt";

export const CLUB_EVENT_INVALID_AUDIENCE_LABEL_DE =
  "Zielgruppe enthält nicht mehr verfügbare Einträge";

export type ClubEventParticipationAudienceClassification =
  | { state: "NONE" }
  | { state: "INVALID"; partialLabel: string | null }
  | { state: "VALID" };

export function classifyClubEventParticipationAudience(
  entries: ClubEventAudienceEntryDto[],
): ClubEventParticipationAudienceClassification {
  if (entries.length === 0) return { state: "NONE" };

  const resolvable = entries.filter((entry) => entry.referenceId.trim().length > 0);
  if (resolvable.length === 0) {
    const partialLabels = entries
      .map((entry) => entry.label.trim())
      .filter((label) => label.length > 0 && label !== "—");
    return {
      state: "INVALID",
      partialLabel: partialLabels.length > 0 ? partialLabels.join(" · ") : null,
    };
  }

  return { state: "VALID" };
}

export function resolveClubEventCommunicationPathFromEntries(
  entries: ClubEventAudienceEntryDto[],
): ClubEventCommunicationScope {
  const resolvable = entries.filter((entry) => entry.referenceId.trim().length > 0);
  if (resolvable.length > 0 && resolvable.every((entry) => entry.kind === "TEAM")) {
    return "TEAM";
  }
  return "CLUB";
}
