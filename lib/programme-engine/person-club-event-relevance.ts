import {
  isClubEventRelevantToOrgUnit,
  isClubEventRelevantToPersonMemberships,
  isClubEventRelevantToTeam,
  type ClubEventOrganisationalAudienceSnapshot,
} from "@/lib/events/club-event-programme-eligibility";
import type { PersonProgrammeScope } from "./person-programme-scope";

/**
 * Sync relevance from pre-resolved PERSON scope (memberships on context).
 * Used when personId is absent; mirrors exact-unit semantics without DB expansion.
 */
export function isClubEventRelevantToPersonProgrammeContext(
  audience: ClubEventOrganisationalAudienceSnapshot,
  scope: PersonProgrammeScope,
): boolean {
  if (audience.scope === "CLUB_WIDE") {
    return true;
  }

  if (
    audience.teamIds.some((teamId) => scope.relevantTeamIds.includes(teamId))
  ) {
    return true;
  }

  if (
    audience.orgUnitIds.some((orgUnitId) => scope.orgUnitIds.includes(orgUnitId))
  ) {
    return true;
  }

  for (const teamId of scope.relevantTeamIds) {
    if (isClubEventRelevantToTeam(audience, teamId)) {
      return true;
    }
  }

  for (const orgUnitId of scope.orgUnitIds) {
    if (isClubEventRelevantToOrgUnit(audience, orgUnitId)) {
      return true;
    }
  }

  return false;
}

export async function isClubEventRelevantToPersonProgrammeScope(input: {
  tenantId: string;
  audience: ClubEventOrganisationalAudienceSnapshot;
  scope: PersonProgrammeScope;
  now?: Date;
}): Promise<boolean> {
  const { audience, scope, tenantId } = input;

  if (audience.scope === "CLUB_WIDE") {
    return true;
  }

  if (scope.personId) {
    return isClubEventRelevantToPersonMemberships({
      tenantId,
      audience,
      personId: scope.personId,
      now: input.now,
    });
  }

  return isClubEventRelevantToPersonProgrammeContext(audience, scope);
}
