/**
 * SCE-CLUB-EVENT-AUDIENCE-01 — canonical programme relevance resolver for Club Events.
 *
 * Parent org unit selection matches requirement/communication audience semantics:
 * exactly the selected unit (no implicit descendant expansion).
 */

import { prisma } from "@/lib/db/prisma";
import type { ClubEventOrganisationalScope } from "./club-event-organisational-audience-types";

export type ClubEventOrganisationalAudienceSnapshot = {
  scope: ClubEventOrganisationalScope;
  teamIds: readonly string[];
  orgUnitIds: readonly string[];
};

export async function loadClubEventOrganisationalAudienceSnapshot(
  tenantId: string,
  eventId: string,
): Promise<ClubEventOrganisationalAudienceSnapshot | null> {
  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId, type: "OTHER" },
    select: {
      clubEventOrganisationalScope: true,
      clubEventOrganisationalAudienceTeams: { select: { teamId: true } },
      clubEventOrganisationalAudienceOrgUnits: { select: { orgUnitId: true } },
    },
  });
  if (!event) return null;

  return {
    scope: event.clubEventOrganisationalScope as ClubEventOrganisationalScope,
    teamIds: event.clubEventOrganisationalAudienceTeams.map((row) => row.teamId),
    orgUnitIds: event.clubEventOrganisationalAudienceOrgUnits.map((row) => row.orgUnitId),
  };
}

export function isClubEventRelevantToTeam(
  audience: ClubEventOrganisationalAudienceSnapshot,
  teamId: string,
): boolean {
  if (audience.scope === "CLUB_WIDE") return true;
  return audience.teamIds.includes(teamId);
}

export function isClubEventRelevantToOrgUnit(
  audience: ClubEventOrganisationalAudienceSnapshot,
  orgUnitId: string,
): boolean {
  if (audience.scope === "CLUB_WIDE") return true;
  return audience.orgUnitIds.includes(orgUnitId);
}

/**
 * Person relevance: club-wide, direct team roster (active season), or direct org membership.
 */
export async function isClubEventRelevantToPersonMemberships(input: {
  tenantId: string;
  audience: ClubEventOrganisationalAudienceSnapshot;
  personId: string;
  now?: Date;
}): Promise<boolean> {
  const { audience, tenantId, personId } = input;
  if (audience.scope === "CLUB_WIDE") return true;

  if (audience.teamIds.length > 0) {
    const teamHit = await prisma.playerSquadMember.findFirst({
      where: {
        personId,
        status: "ACTIVE",
        teamSeason: {
          status: "ACTIVE",
          teamId: { in: [...audience.teamIds] },
          team: { tenantId },
        },
      },
      select: { id: true },
    });
    if (teamHit) return true;

    const trainerHit = await prisma.trainerTeamMember.findFirst({
      where: {
        personId,
        status: "ACTIVE",
        teamSeason: {
          status: "ACTIVE",
          teamId: { in: [...audience.teamIds] },
          team: { tenantId },
        },
      },
      select: { id: true },
    });
    if (trainerHit) return true;
  }

  if (audience.orgUnitIds.length > 0) {
    const now = input.now ?? new Date();
    const orgHit = await prisma.orgUnitMembership.findFirst({
      where: {
        tenantId,
        personId,
        orgUnitId: { in: [...audience.orgUnitIds] },
        status: "ACTIVE",
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
      select: { id: true },
    });
    if (orgHit) return true;
  }

  return false;
}
