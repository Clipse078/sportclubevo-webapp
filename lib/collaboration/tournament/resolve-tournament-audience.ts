import { prisma } from "@/lib/db/prisma";
import { dedupeTenantTeamIds } from "@/lib/collaboration/shared/operational-audience";

export type ResolvedTournamentAudience = {
  primaryTeamId: string;
  teamIds: string[];
  teamName: string;
  teamNamesLabel: string | null;
};

export async function resolveTournamentAudienceContext(input: {
  tenantId: string;
  tournamentId: string;
  eventTeamId: string | null;
}): Promise<ResolvedTournamentAudience | null> {
  const participants = await prisma.tournamentParticipant.findMany({
    where: { tenantId: input.tenantId, eventId: input.tournamentId, teamId: { not: null } },
    select: { teamId: true, team: { select: { id: true, name: true } } },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
  });

  const teamIds = dedupeTenantTeamIds([
    input.eventTeamId,
    ...participants.map((p) => p.teamId),
  ]);

  if (teamIds.length === 0) return null;

  const teams = await prisma.team.findMany({
    where: { tenantId: input.tenantId, id: { in: teamIds } },
    select: { id: true, name: true },
  });
  if (teams.length === 0) return null;

  const nameById = new Map(teams.map((t) => [t.id, t.name]));
  const orderedNames = teamIds.map((id) => nameById.get(id)).filter(Boolean) as string[];
  const primaryTeamId =
    (input.eventTeamId && teamIds.includes(input.eventTeamId) ? input.eventTeamId : null) ??
    teamIds[0]!;
  const teamName = nameById.get(primaryTeamId) ?? orderedNames[0] ?? "Team";
  const teamNamesLabel =
    orderedNames.length > 1 ? orderedNames.join(", ") : orderedNames[0] ?? teamName;

  return { primaryTeamId, teamIds, teamName, teamNamesLabel };
}
