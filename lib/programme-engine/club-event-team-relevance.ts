import type { ClubEventOrganisationalAudienceSnapshot } from "@/lib/events/club-event-programme-eligibility";
import {
  isClubEventRelevantToOrgUnit,
  isClubEventRelevantToTeam,
} from "@/lib/events/club-event-programme-eligibility";

/** Team programme Club Event relevance — canonical audience only (no legacy Event.teamId). */
export function isClubEventRelevantToTeamProgrammeContext(
  audience: ClubEventOrganisationalAudienceSnapshot,
  context: { teamId: string; orgUnitId: string | null },
): boolean {
  if (isClubEventRelevantToTeam(audience, context.teamId)) {
    return true;
  }
  if (context.orgUnitId && isClubEventRelevantToOrgUnit(audience, context.orgUnitId)) {
    return true;
  }
  return false;
}
