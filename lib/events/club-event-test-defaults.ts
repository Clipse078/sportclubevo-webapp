import type { ClubEvent } from "@/lib/events/club-events-service";
import { emptyClubEventOrganisationalAudienceDto } from "@/lib/events/club-event-organisational-audience-types";

export function applyClubEventOrganisationalAudienceTestDefaults(
  event: Omit<ClubEvent, "clubEventOrganisationalScope" | "organisationalAudience"> &
    Partial<Pick<ClubEvent, "clubEventOrganisationalScope" | "organisationalAudience">>,
): ClubEvent {
  const organisationalAudience =
    event.organisationalAudience ?? emptyClubEventOrganisationalAudienceDto();
  return {
    ...event,
    clubEventOrganisationalScope:
      event.clubEventOrganisationalScope ?? organisationalAudience.scope,
    clubEventSeriesId: event.clubEventSeriesId ?? null,
    clubEventOccurrenceDateKey: event.clubEventOccurrenceDateKey ?? null,
    organisationalAudience,
  };
}
