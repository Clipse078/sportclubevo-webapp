/**
 * SCE-COLLAB-01C — club event participation audience → CommunicationAudienceSpec.
 */

import type { EventParticipationAudienceKind } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";
import {
  listClubEventAudienceEntries,
  type ClubEventAudienceEntryDto,
} from "@/lib/events/club-event-participation-audience-service";
import { dedupeTenantTeamIds } from "@/lib/collaboration/shared/operational-audience";
import type { ClubEventActivitySnapshot } from "@/lib/collaboration/club-event/club-event-activity-snapshot";
import {
  resolveClubEventCommunicationPathFromEntries,
  type ClubEventCommunicationScope,
} from "@/lib/collaboration/club-event/club-event-audience-presentation";

export type ResolvedClubEventAudience = {
  audienceSpec: CommunicationAudienceSpec;
  audienceLabel: string;
  /** Conversation anchor when using the team communication path. */
  primaryTeamId: string | null;
  teamIds: string[];
  teamName: string;
  teamNamesLabel: string | null;
  communicationPath: ClubEventCommunicationScope;
  participationEntries: ClubEventAudienceEntryDto[];
};

export function formatClubEventParticipationAudienceLabel(
  entries: Awaited<ReturnType<typeof listClubEventAudienceEntries>>,
): string | null {
  const labels = entries
    .map((entry) => entry.label.trim())
    .filter((label) => label.length > 0 && label !== "—");
  if (labels.length === 0) return null;
  if (labels.length === 1) return labels[0]!;
  return labels.join(" · ");
}

export function buildAudienceSpecFromEntries(
  entries: ClubEventAudienceEntryDto[],
): CommunicationAudienceSpec | null {
  const eligibleEntries = entries.filter((entry) => entry.referenceId.trim().length > 0);
  if (eligibleEntries.length === 0) return null;

  const components: CommunicationAudienceSpec["components"] = [];
  const personIds: string[] = [];
  const teamIds: string[] = [];
  const orgUnitIds: string[] = [];
  const roleIds: string[] = [];

  for (const entry of eligibleEntries) {
    switch (entry.kind as EventParticipationAudienceKind) {
      case "PERSON":
        if (entry.referenceId) personIds.push(entry.referenceId);
        break;
      case "TEAM":
        if (entry.referenceId) teamIds.push(entry.referenceId);
        break;
      case "ORG_UNIT":
        if (entry.referenceId) orgUnitIds.push(entry.referenceId);
        break;
      case "ROLE":
        if (entry.referenceId) roleIds.push(entry.referenceId);
        break;
      default:
        break;
    }
  }

  const uniquePersonIds = [...new Set(personIds)];
  const uniqueTeamIds = dedupeTenantTeamIds(teamIds);
  const uniqueOrgUnitIds = [...new Set(orgUnitIds)];
  const uniqueRoleIds = [...new Set(roleIds)];

  if (uniquePersonIds.length > 0) {
    components.push({
      label: uniquePersonIds.length === 1 ? "Person" : "Personen",
      explicit: { includePersonIds: uniquePersonIds },
    });
  }
  if (uniqueTeamIds.length > 0) {
    components.push({
      label: uniqueTeamIds.length === 1 ? "Team" : "Teams",
      structural: { teamIds: uniqueTeamIds },
    });
  }
  if (uniqueOrgUnitIds.length > 0) {
    components.push({
      label: uniqueOrgUnitIds.length === 1 ? "Organisationseinheit" : "Organisationseinheiten",
      structural: { orgUnitIds: uniqueOrgUnitIds },
    });
  }
  if (uniqueRoleIds.length > 0) {
    components.push({
      label: uniqueRoleIds.length === 1 ? "Rolle" : "Rollen",
      structural: { roleIds: uniqueRoleIds },
    });
  }

  if (components.length === 0) return null;

  return { composition: "UNION", components };
}

export async function resolveClubEventAudienceContext(input: {
  tenantId: string;
  snapshot: ClubEventActivitySnapshot;
}): Promise<ResolvedClubEventAudience | null> {
  const entries = await listClubEventAudienceEntries(input.tenantId, input.snapshot.eventId);
  const audienceSpec = buildAudienceSpecFromEntries(entries);
  const audienceLabel = formatClubEventParticipationAudienceLabel(entries);
  if (!audienceSpec || !audienceLabel) return null;

  const communicationPath = resolveClubEventCommunicationPathFromEntries(entries);
  const teamIdsFromAudience = dedupeTenantTeamIds(
    entries.filter((e) => e.kind === "TEAM").map((e) => e.referenceId),
  );
  const teamIds =
    communicationPath === "TEAM"
      ? teamIdsFromAudience
      : dedupeTenantTeamIds([input.snapshot.teamId, ...teamIdsFromAudience].filter(Boolean) as string[]);

  let teamName = "Veranstaltungsteilnehmer";
  let teamNamesLabel: string | null = audienceLabel;
  let primaryTeamId: string | null =
    communicationPath === "TEAM" ? (teamIdsFromAudience[0] ?? null) : null;

  if (teamIdsFromAudience.length > 0) {
    const teams = await prisma.team.findMany({
      where: { tenantId: input.tenantId, id: { in: teamIdsFromAudience } },
      select: { id: true, name: true },
    });
    const byId = new Map(teams.map((t) => [t.id, t.name]));
    const orderedNames = teamIdsFromAudience
      .map((id) => byId.get(id))
      .filter(Boolean) as string[];
    if (communicationPath === "TEAM") {
      teamName = orderedNames[0] ?? teamName;
      if (orderedNames.length > 0) {
        teamNamesLabel =
          orderedNames.length > 1 ? orderedNames.join(", ") : orderedNames[0] ?? audienceLabel;
      }
    }
  }

  return {
    audienceSpec,
    audienceLabel,
    primaryTeamId,
    teamIds,
    teamName,
    teamNamesLabel,
    communicationPath,
    participationEntries: entries,
  };
}
